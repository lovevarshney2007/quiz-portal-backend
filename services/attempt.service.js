const attemptRepository = require('../repositories/attempt.repository');
const examRepository = require('../repositories/exam.repository');
const redisClient = require('../config/redis');
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
        const key = `exam_attempt_hash:${examId}:${userId}`;

        // 1. Fetch current meta directly from HASH
        const metaStr = await redisClient.hget(key, 'meta');
        let meta = metaStr ? JSON.parse(metaStr) : {
            tabSwitchCount: attempt.tabSwitchCount || 0,
            fullscreenExits: attempt.fullscreenExits || 0
        };

        let metaChanged = false;
        if (payload.tabSwitchCount !== undefined) { meta.tabSwitchCount = payload.tabSwitchCount; metaChanged = true; }
        if (payload.fullscreenExits !== undefined) { meta.fullscreenExits = payload.fullscreenExits; metaChanged = true; }

        if (metaChanged) {
            await redisClient.hset(key, 'meta', JSON.stringify(meta));
        }

        let qState = null;
        if (payload.questionId) {
            const qId = payload.questionId.toString();
            const qStr = await redisClient.hget(key, `q_${qId}`);
            
            if (qStr) {
                qState = JSON.parse(qStr);
            } else {
                const statuses = await attemptRepository.getQuestionStatuses(attempt._id);
                const existingStatus = statuses.find(s => s.questionId.toString() === qId);
                qState = existingStatus ? {
                    status: existingStatus.status,
                    givenAnswer: existingStatus.givenAnswer,
                    timeSpent: existingStatus.timeSpent || 0,
                    visitedCount: existingStatus.visitedCount || 0
                } : { timeSpent: 0, visitedCount: 0 };
            }
            
            // 1. Safe givenAnswer overwrite (Race-condition protection logic)
            if (payload.givenAnswer !== undefined) {
                const isNonEmpty = Array.isArray(payload.givenAnswer)
                    ? payload.givenAnswer.length > 0
                    : (payload.givenAnswer !== null && payload.givenAnswer !== '' && payload.givenAnswer !== undefined);
                const isDeliberateClear = payload.status === 'Visited' || payload.status === 'Skipped';
                const existingIsEmpty = !qState.givenAnswer ||
                    (Array.isArray(qState.givenAnswer) && qState.givenAnswer.length === 0);
                if (isNonEmpty || isDeliberateClear || existingIsEmpty) {
                    qState.givenAnswer = payload.givenAnswer;
                }
            }

            // 2. Status update & Auto-Answered verification
            const hasAnswer = qState.givenAnswer && (
                Array.isArray(qState.givenAnswer) 
                    ? qState.givenAnswer.length > 0 && qState.givenAnswer.some(a => String(a).trim() !== '')
                    : String(qState.givenAnswer).trim() !== ''
            );

            if (payload.status) {
                qState.status = payload.status;
            } else if (hasAnswer) {
                qState.status = 'Answered';
            }

            if (hasAnswer && (qState.status === 'Visited' || qState.status === 'NotVisited')) {
                qState.status = 'Answered';
            }

            if (payload.timeSpent) qState.timeSpent += payload.timeSpent;
            qState.visitedCount += 1;

            // Atomically write this specific question state back to Hash
            await redisClient.hset(key, `q_${qId}`, JSON.stringify(qState));

            // Asynchronously update MongoDB so answers are NEVER lost on logout or page refresh!
            attemptRepository.updateQuestionStatus(attempt._id, qId, qState).catch(err => console.error("Mongo autoSave background error:", err));
        }

        // Save to Redis (expires in 24 hours to prevent memory leaks)
        await redisClient.expire(key, 86400);

        // Since frontend might need full state for summary updates, we could fetch it, 
        // but it's more efficient to just return the updated part and let frontend merge.
        // Returning full state to match old API contract for now.
        return await this.getState(userId, examId);
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
        const key = `exam_attempt_hash:${examId}:${userId}`;
        const hashData = await redisClient.hgetall(key);
        
        // Load statuses from MongoDB to ensure complete data
        const statuses = await attemptRepository.getQuestionStatuses(attempt._id);
        const state = {
            questions: {},
            tabSwitchCount: attempt.tabSwitchCount || 0,
            fullscreenExits: attempt.fullscreenExits || 0
        };

        statuses.forEach(s => {
            state.questions[s.questionId.toString()] = {
                status: s.status,
                givenAnswer: s.givenAnswer,
                timeSpent: s.timeSpent || 0,
                visitedCount: s.visitedCount || 0
            };
        });

        if (hashData && Object.keys(hashData).length > 0) {
            if (hashData.meta) {
                const meta = JSON.parse(hashData.meta);
                if (meta.tabSwitchCount !== undefined) state.tabSwitchCount = meta.tabSwitchCount;
                if (meta.fullscreenExits !== undefined) state.fullscreenExits = meta.fullscreenExits;
            }
            
            for (const [field, valueStr] of Object.entries(hashData)) {
                if (field.startsWith('q_')) {
                    const qId = field.replace('q_', '');
                    const qData = JSON.parse(valueStr);
                    state.questions[qId] = { ...state.questions[qId], ...qData };
                }
            }
        }

        return state;
    }

    async submitExam(userId, examId, isAutoSubmit = false, answersPayload = null) {
        // 1. Atomically transition status from InProgress -> Submitted/AutoSubmitted
        const targetStatus = isAutoSubmit ? 'AutoSubmitted' : 'Submitted';
        const ExamAttempt = require('../models/ExamAttempt');
        const attempt = await ExamAttempt.findOneAndUpdate(
            { userId, examId, status: 'InProgress' },
            { $set: { status: targetStatus, endTime: new Date() } },
            { new: true }
        );

        // If attempt is null, it was already submitted by another thread/request!
        if (!attempt) {
            const existingAttempt = await attemptRepository.findAttemptByUserAndExam(userId, examId);
            if (!existingAttempt) throw new CustomError('Exam attempt not found', 404);
            return existingAttempt; // Return idempotently without recalculating
        }

        // 1. If explicit answers array provided in request, write directly to MongoDB
        if (Array.isArray(answersPayload) && answersPayload.length > 0) {
            const explicitUpdates = answersPayload.map(ans => {
                const qId = (ans.questionId || ans.question || '').toString();
                if (!qId) return null;
                const statusData = {
                    status: ans.status || (ans.givenAnswer && ans.givenAnswer.length > 0 ? 'Answered' : 'NotVisited'),
                    givenAnswer: Array.isArray(ans.givenAnswer) ? ans.givenAnswer : (ans.givenAnswer ? [ans.givenAnswer] : []),
                    timeSpent: Number(ans.timeSpent || 0)
                };
                return attemptRepository.updateQuestionStatus(attempt._id, qId, statusData);
            }).filter(Boolean);
            await Promise.all(explicitUpdates).catch(err => console.error("Error writing explicit answers to Mongo:", err));
        }

        const redisClient = require('../config/redis');
        const key = `exam_attempt_hash:${examId}:${userId}`;
        const hashData = await redisClient.hgetall(key);

        if (hashData && Object.keys(hashData).length > 0) {
            if (hashData.meta) {
                const meta = JSON.parse(hashData.meta);
                if (meta.tabSwitchCount !== undefined) attempt.tabSwitchCount = meta.tabSwitchCount;
                if (meta.fullscreenExits !== undefined) attempt.fullscreenExits = meta.fullscreenExits;
            }
            await attempt.save();
            
            // Flush all question statuses from Redis to MongoDB
            const updates = [];
            for (const [field, valueStr] of Object.entries(hashData)) {
                if (field.startsWith('q_')) {
                    const qId = field.replace('q_', '');
                    const qData = JSON.parse(valueStr);
                    updates.push(attemptRepository.updateQuestionStatus(attempt._id, qId, qData));
                }
            }
            await Promise.all(updates);

            // Clear Redis key
            await redisClient.del(key);
        }

        // 3. Offload 100% of result computation to BullMQ worker queue
        try {
            const { resultQueue } = require('../queues/resultQueue');
            await resultQueue.add('generateResults', { 
                examId, 
                attemptId: attempt._id 
            }, {
                jobId: `result_${attempt._id}`, // Enforce BullMQ job deduplication!
                removeOnComplete: true,
                attempts: 3
            });
        } catch (qErr) {
            console.warn("Queue trigger skipped for attempt " + attempt._id + ":", qErr.message);
        }

        return attempt;
    }

    async resetAttempt(userId, examId) {
        await attemptRepository.deleteAttemptByUserAndExam(userId, examId);
        // Clear both Redis key formats to ensure clean slate
        const redisClient = require('../config/redis');
        await redisClient.del(`exam_attempt_hash:${examId}:${userId}`).catch(() => {});
        await redisClient.del(`attempt:${userId}:${examId}`).catch(() => {});
        await redisClient.del(`exam_attempt:${examId}:${userId}`).catch(() => {});
        
        // Also delete old Result so leaderboard and score reset properly
        const Result = require('../models/Result');
        await Result.deleteOne({ student: userId, exam: examId }).catch(() => {});
        
        return { message: "Attempt reset successfully for testing" };
    }
}

module.exports = new AttemptService();
