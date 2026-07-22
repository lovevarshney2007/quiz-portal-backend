const attemptRepository = require('../repositories/attempt.repository');
const examRepository = require('../repositories/exam.repository');
const CustomError = require('../utils/customError');

class AttemptService {
    async startExam(userId, examId) {
        const exam = await examRepository.findById(examId);
        if (!exam) {
            throw new CustomError('Exam not found', 404);
        }

        const now = new Date();
        if (now < exam.startTime || now > exam.endTime) {
            throw new CustomError('Exam is not currently active', 403);
        }

        let attempt = await attemptRepository.findAttemptByUserAndExam(userId, examId);
        
        if (attempt) {
            if (attempt.status !== 'InProgress') {
                throw new CustomError('Exam already submitted', 400);
            }
            // Resume session
            return { attempt, isResume: true };
        }

        // Generate randomized question mapping
        const questionRepository = require('../repositories/question.repository');
        const questions = await questionRepository.findByExamId(examId);
        
        const shuffle = (array) => {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        };

        const questionMapping = shuffle([...questions]).map((q, index) => {
            const optionsCount = q.options ? q.options.length : 0;
            const optionsOrder = shuffle(Array.from({length: optionsCount}, (_, i) => i));
            return {
                questionId: q._id,
                order: index + 1,
                optionsOrder
            };
        });

        attempt = await attemptRepository.createAttempt({ userId, examId, questionMapping });
        return { attempt, isResume: false };
    }

    async autoSave(userId, examId, payload) {
        const attempt = await attemptRepository.findAttemptByUserAndExam(userId, examId);
        if (!attempt || attempt.status !== 'InProgress') {
            throw new CustomError('Active exam attempt not found', 400);
        }

        // Server-controlled timer validation
        const exam = await examRepository.findById(examId);
        const timeElapsed = (Date.now() - attempt.startTime.getTime()) / 60000;
        if (timeElapsed > exam.duration) {
            await this.submitExam(userId, examId, true);
            throw new CustomError('Exam time has expired', 403);
        }

        const redisClient = require('../config/redis');
        const key = `exam_attempt:${examId}:${userId}`;

        // Get current state from Redis or start fresh
        const existingDataStr = await redisClient.get(key);
        let state = existingDataStr ? JSON.parse(existingDataStr) : {
            questions: {},
            tabSwitchCount: attempt.tabSwitchCount,
            fullscreenExits: attempt.fullscreenExits
        };

        // Update violations if provided
        if (payload.tabSwitchCount !== undefined) state.tabSwitchCount = payload.tabSwitchCount;
        if (payload.fullscreenExits !== undefined) state.fullscreenExits = payload.fullscreenExits;

        // Update question status if provided
        if (payload.questionId) {
            const qId = payload.questionId.toString();
            if (!state.questions[qId]) {
                state.questions[qId] = { timeSpent: 0, visitedCount: 0 };
            }
            
            if (payload.status) state.questions[qId].status = payload.status;
            if (payload.givenAnswer !== undefined) state.questions[qId].givenAnswer = payload.givenAnswer;
            if (payload.timeSpent) state.questions[qId].timeSpent += payload.timeSpent;
            state.questions[qId].visitedCount += 1;
        }

        // Save to Redis (expires in 24 hours to prevent memory leaks)
        await redisClient.set(key, JSON.stringify(state), 'EX', 86400);

        return state;
    }

    async getSummary(userId, examId) {
        const state = await this.getState(userId, examId);
        let attempted = 0, markedForReview = 0, unattempted = 0;
        
        Object.values(state.questions).forEach(q => {
            if (q.status === 'Answered') attempted++;
            else if (q.status === 'MarkedForReview' || q.status === 'AnsweredMarkedForReview') markedForReview++;
            else unattempted++;
        });

        // Add remaining unvisited questions from the total exam questions
        const exam = await examRepository.findById(examId);
        const totalVisited = attempted + markedForReview + unattempted;
        unattempted += Math.max(0, exam.totalQuestions - totalVisited);

        return { attempted, markedForReview, unattempted };
    }

    async getState(userId, examId) {
        const attempt = await attemptRepository.findAttemptByUserAndExam(userId, examId);
        if (!attempt) {
            throw new CustomError('Attempt not found', 404);
        }

        const redisClient = require('../config/redis');
        const key = `exam_attempt:${examId}:${userId}`;
        const existingDataStr = await redisClient.get(key);
        
        if (existingDataStr) {
            return JSON.parse(existingDataStr);
        }

        // Fallback to MongoDB if Redis key expired or hasn't been created
        const statuses = await attemptRepository.getQuestionStatuses(attempt._id);
        const state = {
            questions: {},
            tabSwitchCount: attempt.tabSwitchCount,
            fullscreenExits: attempt.fullscreenExits
        };

        statuses.forEach(s => {
            state.questions[s.questionId.toString()] = {
                status: s.status,
                givenAnswer: s.givenAnswer,
                timeSpent: s.timeSpent,
                visitedCount: s.visitedCount
            };
        });

        return state;
    }

    async submitExam(userId, examId, isAutoSubmit = false) {
        const attempt = await attemptRepository.findAttemptByUserAndExam(userId, examId);
        if (!attempt || attempt.status !== 'InProgress') {
            throw new CustomError('Active exam attempt not found', 400);
        }

        const redisClient = require('../config/redis');
        const key = `exam_attempt:${examId}:${userId}`;
        const existingDataStr = await redisClient.get(key);

        if (existingDataStr) {
            const state = JSON.parse(existingDataStr);
            
            // Flush violations
            attempt.tabSwitchCount = state.tabSwitchCount;
            attempt.fullscreenExits = state.fullscreenExits;
            
            // Flush all question statuses from Redis to MongoDB
            const updates = Object.entries(state.questions).map(([qId, qData]) => {
                return attemptRepository.updateQuestionStatus(attempt._id, qId, qData);
            });
            await Promise.all(updates);

            // Clear Redis key
            await redisClient.del(key);
        }

        attempt.status = isAutoSubmit ? 'AutoSubmitted' : 'Submitted';
        attempt.endTime = new Date();
        await attempt.save();
        
        // Trigger result generation
        const { Queue } = require('bullmq');
        const resultQueue = new Queue('resultQueue', {
            connection: redisClient.redisConfig
        });
        await resultQueue.add('generateResults', { examId });

        return attempt;
    }
}

module.exports = new AttemptService();
