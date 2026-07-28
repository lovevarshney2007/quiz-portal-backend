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
                const adminResetEmail = (process.env.ADMIN_RESET_EMAIL || "").toLowerCase();
                const isTestExempt = role === 'admin' || 
                    (adminResetEmail && email === adminResetEmail);

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

        const startTime = attempt.startTime instanceof Date ? attempt.startTime : new Date(attempt.startTime);
        const timeElapsed = (Date.now() - startTime.getTime()) / 60000;
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
            
            // Acquire distributed lock for this specific question to prevent HGET/HSET race conditions
            const lockKey = `lock:${key}:q_${qId}`;
            let acquired = false;
            for (let i = 0; i < 10; i++) {
                acquired = await redisClient.set(lockKey, '1', 'NX', 'PX', 2000); // 2 second lock
                if (acquired) break;
                await new Promise(r => setTimeout(r, 100)); // wait 100ms before retry
            }
            if (!acquired) {
                console.warn(`Failed to acquire lock for ${lockKey}`);
                throw new CustomError('Too many concurrent requests, please slow down', 429);
            }

            try {
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

            // Await update to MongoDB so we don't saturate the Node.js event loop with unhandled promises
            await attemptRepository.updateQuestionStatus(attempt._id, qId, qState).catch(err => console.error("Mongo autoSave background error:", err));

            } finally {
                await redisClient.del(`lock:${key}:q_${qId}`);
            }
        }

        // Save to Redis (expires in 24 hours to prevent memory leaks)
        await redisClient.expire(key, 86400);

        // Return only the updated question state, not the full state.
        // Calling getState() here was causing a full MongoDB round-trip on EVERY
        // autoSave call — with 800 students saving every few seconds, this was
        // ~4000 unnecessary DB queries/minute.
        return { updated: true, questionId: payload.questionId, qState };
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

        const Result = require('../models/Result');
        const result = await Result.findOne({ student: userId, exam: examId }).lean();
        
        const summaryData = { attempted, markedForReview, unattempted };
        
        if (result) {
            summaryData.score = result.totalScore;
            summaryData.maxScore = result.maxScore;
            summaryData.correct = result.correctAnswers;
            summaryData.incorrect = result.wrongAnswers;
            summaryData.percentage = result.percentage;
            summaryData.unattempted = result.skippedQuestions; // More accurate from result
        }
        
        return summaryData;
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
        const ExamAttempt = require('../models/ExamAttempt');
        // 1. Fetch current attempt first to verify status
        let attempt = await attemptRepository.findAttemptByUserAndExam(userId, examId);
        if (!attempt) throw new CustomError('Exam attempt not found', 404);
        
        if (attempt.status !== 'InProgress') {
            return attempt; // Return idempotently without recalculating if already submitted
        }

        // 2. If explicit answers array provided in request, write directly to MongoDB
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

        // 3. Flush all remaining data from Redis to MongoDB BEFORE marking as submitted
        const redisClient = require('../config/redis');
        const key = `exam_attempt_hash:${examId}:${userId}`;
        const hashData = await redisClient.hgetall(key);

        let finalTabSwitchCount = attempt.tabSwitchCount || 0;
        let finalFullscreenExits = attempt.fullscreenExits || 0;

        if (hashData && Object.keys(hashData).length > 0) {
            if (hashData.meta) {
                const meta = JSON.parse(hashData.meta);
                if (meta.tabSwitchCount !== undefined) finalTabSwitchCount = meta.tabSwitchCount;
                if (meta.fullscreenExits !== undefined) finalFullscreenExits = meta.fullscreenExits;
            }
            
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

        // 4. Atomically transition status from InProgress -> Submitted/AutoSubmitted
        const targetStatus = isAutoSubmit ? 'AutoSubmitted' : 'Submitted';
        attempt = await ExamAttempt.findOneAndUpdate(
            { userId, examId, status: 'InProgress' },
            { $set: { 
                status: targetStatus, 
                endTime: new Date(),
                tabSwitchCount: finalTabSwitchCount,
                fullscreenExits: finalFullscreenExits
            } },
            { returnDocument: 'after' }
        );

        if (!attempt) {
            // Someone else beat us to it while flushing Redis
            return await attemptRepository.findAttemptByUserAndExam(userId, examId);
        }

        // 3. Compute result synchronously for immediate availability
        try {
            const resultService = require('./result.service');
            await resultService.calculateResult(attempt._id);
            console.log(`Computed result synchronously for attempt ${attempt._id}`);
        } catch (err) {
            console.error("Result calculation failed during submit:", err);
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
