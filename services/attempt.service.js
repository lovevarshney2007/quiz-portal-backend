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
        if (exam.status !== 'Started' && exam.status !== 'Published') {
            throw new CustomError('Exam is not currently active', 403);
        }
        if (exam.status === 'Published' && (now < exam.startTime || now > exam.endTime)) {
            throw new CustomError('Exam is not currently active', 403);
        }

        let attempt = await attemptRepository.findAttemptByUserAndExam(userId, examId);
        
        if (attempt) {
            if (attempt.status !== 'InProgress') {
                // Check if user is an exempt test user (Admin or love2510084@akgec.ac.in / 2510084)
                const userRepository = require('../repositories/user.repository');
                const user = await userRepository.findById(userId).catch(() => null);
                const email = (user?.email || "").toLowerCase();
                const role = (user?.role || "").toLowerCase();
                const studentNum = String(user?.studentNumber || user?.rollNumber || user?.id || "");
                const isTestExempt = role === 'admin' || email === 'admin@akgec.ac.in' || email === 'love2510084@akgec.ac.in' || studentNum === '2510084';

                if (isTestExempt) {
                    // For test users: fully reset attempt for a fresh start
                    // 1. Clear old QuestionStatuses so scores don't bleed from old session
                    const QuestionStatus = require('../models/QuestionStatus');
                    await QuestionStatus.deleteMany({ attemptId: attempt._id });

                    // 2. Clear Redis so old answers don't bleed in
                    const redisClient = require('../config/redis');
                    await redisClient.del(`exam_attempt:${examId}:${userId}`).catch(() => {});

                    // 3. Reset attempt fields
                    attempt.status = 'InProgress';
                    attempt.startTime = new Date();
                    attempt.endTime = null;
                    attempt.tabSwitchCount = 0;
                    attempt.fullscreenExits = 0;
                    await attempt.save();
                    return { attempt, isResume: false };
                }
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
            throw new CustomError('Active exam attempt not found or exam is already submitted', 400);
        }

        // Server-controlled timer & exam status validation
        const exam = await examRepository.findById(examId);
        if (!exam) {
            throw new CustomError('Exam not found', 404);
        }

        if (exam.status === 'Completed' || exam.status === 'Archived') {
            await this.submitExam(userId, examId, true).catch(() => {});
            throw new CustomError('Exam has been completed by the administrator', 403);
        }

        const timeElapsed = (Date.now() - attempt.startTime.getTime()) / 60000;
        if (timeElapsed > exam.duration) {
            await this.submitExam(userId, examId, true);
            throw new CustomError('Exam time has expired', 403);
        }

        const redisClient = require('../config/redis');
        const key = `exam_attempt:${examId}:${userId}`;

        // Get current state from Redis or start fresh with DB fallback
        const existingDataStr = await redisClient.get(key);
        let state;
        if (existingDataStr) {
            state = JSON.parse(existingDataStr);
        } else {
            const statuses = await attemptRepository.getQuestionStatuses(attempt._id);
            state = {
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
        }

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

            // Asynchronously update MongoDB so answers are NEVER lost on logout or page refresh!
            attemptRepository.updateQuestionStatus(attempt._id, qId, state.questions[qId]).catch(err => console.error("Mongo autoSave background error:", err));
        }

        // Save to Redis (expires in 24 hours to prevent memory leaks)
        await redisClient.set(key, JSON.stringify(state), 'EX', 86400);

        return state;
    }

    async getSummary(userId, examId) {
        const state = await this.getState(userId, examId);
        let attempted = 0, markedForReview = 0, unattempted = 0;
        
        Object.values(state.questions).forEach(q => {
            const hasAnswer = q.givenAnswer && (Array.isArray(q.givenAnswer) ? q.givenAnswer.length > 0 : String(q.givenAnswer).trim() !== '');
            const isAnswered = q.status === 'Answered' || q.status === 'AnsweredMarkedForReview' || hasAnswer;

            if (isAnswered) {
                attempted++;
                if (q.status === 'AnsweredMarkedForReview' || q.status === 'MarkedForReview') {
                    markedForReview++;
                }
            } else if (q.status === 'MarkedForReview') {
                markedForReview++;
            } else {
                unattempted++;
            }
        });

        // Add remaining unvisited questions from the total exam questions
        const exam = await examRepository.findById(examId);
        const totalVisited = Object.keys(state.questions).length;
        if (exam && exam.totalQuestions) {
            unattempted += Math.max(0, exam.totalQuestions - totalVisited);
        }

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
        
        // Load statuses from MongoDB to merge and ensure no answers were lost!
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

        if (existingDataStr) {
            const redisState = JSON.parse(existingDataStr);
            if (redisState && redisState.questions) {
                // Merge redis questions over mongo questions
                Object.entries(redisState.questions).forEach(([qId, qData]) => {
                    state.questions[qId] = { ...state.questions[qId], ...qData };
                });
            }
            if (redisState.tabSwitchCount !== undefined) state.tabSwitchCount = redisState.tabSwitchCount;
            if (redisState.fullscreenExits !== undefined) state.fullscreenExits = redisState.fullscreenExits;
        } else {
            // Re-warm Redis from DB
            await redisClient.set(key, JSON.stringify(state), 'EX', 86400).catch(() => {});
        }

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
        
        // Directly calculate result in DB immediately!
        const resultService = require('./result.service');
        await resultService.calculateResult(attempt._id).catch(err => console.error("Error generating result directly:", err));

        // Also trigger Queue backup
        try {
            const { Queue } = require('bullmq');
            const Redis = require('ioredis');
            const resultQueue = new Queue('resultQueue', {
                connection: new Redis(redisClient.redisConfig, { maxRetriesPerRequest: null })
            });
            await resultQueue.add('generateResults', { examId });
        } catch (qErr) {
            console.warn("Queue trigger skipped:", qErr.message);
        }

        return attempt;
    }

    async resetAttempt(userId, examId) {
        await attemptRepository.deleteAttemptByUserAndExam(userId, examId);
        // Clear both Redis key formats to ensure clean slate
        await redisClient.del(`attempt:${userId}:${examId}`).catch(() => {});
        await redisClient.del(`exam_attempt:${examId}:${userId}`).catch(() => {});
        // Also delete old Result so leaderboard and score reset properly
        const Result = require('../models/Result');
        await Result.deleteOne({ student: userId, exam: examId }).catch(() => {});
        return { message: "Attempt reset successfully for testing" };
    }
}

module.exports = new AttemptService();
