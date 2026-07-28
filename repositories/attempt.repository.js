const ExamAttempt = require('../models/ExamAttempt');
const QuestionStatus = require('../models/QuestionStatus');

class AttemptRepository {
    async createAttempt(attemptData) {
        const mongoose = require('mongoose');
        const attemptId = new mongoose.Types.ObjectId();
        
        // Convert to ObjectId if necessary
        const safeUserId = typeof attemptData.userId === 'string' ? new mongoose.Types.ObjectId(attemptData.userId) : attemptData.userId;
        const safeExamId = typeof attemptData.examId === 'string' ? new mongoose.Types.ObjectId(attemptData.examId) : attemptData.examId;

        const insertData = {
            _id: attemptId,
            ...attemptData,
            userId: safeUserId,
            examId: safeExamId,
            status: 'InProgress',
            timeSpent: 0,
            tabSwitchCount: 0,
            fullscreenExits: 0,
            isSuspicious: false,
            startTime: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        // Use native insert to bypass Mongoose's massive overhead for large arrays
        ExamAttempt.collection.insertOne(insertData).catch(err => {
            console.error('Async insert failed for ExamAttempt:', err);
        });
        
        const redisClient = require('../config/redis');
        const cacheKey = `exam_attempt:${safeExamId}:${safeUserId}`;
        await redisClient.set(cacheKey, JSON.stringify(insertData), 'EX', 7200).catch(() => null);
        
        return insertData;
    }

    async findAttemptByUserAndExam(userId, examId) {
        const redisClient = require('../config/redis');
        const cacheKey = `exam_attempt:${examId}:${userId}`;
        const cached = await redisClient.get(cacheKey).catch(() => null);
        if (cached) return JSON.parse(cached);
        
        const attempt = await ExamAttempt.findOne({ userId, examId }).lean();
        if (attempt) {
            await redisClient.set(cacheKey, JSON.stringify(attempt), 'EX', 7200).catch(() => null);
        }
        return attempt;
    }

    async findAttemptById(attemptId) {
        return await ExamAttempt.findById(attemptId);
    }

    async findAttemptsByExamId(examId) {
        return await ExamAttempt.find({ examId });
    }

    async updateAttempt(attemptId, updateData) {
        return await ExamAttempt.findByIdAndUpdate(attemptId, updateData, { new: true });
    }

    async getQuestionStatuses(attemptId) {
        return await QuestionStatus.find({ attemptId });
    }

    async updateQuestionStatus(attemptId, questionId, statusData) {
        return await QuestionStatus.findOneAndUpdate(
            { attemptId, questionId },
            statusData,
            { returnDocument: 'after', upsert: true } // Create if doesn't exist
        );
    }

    async deleteAttemptByUserAndExam(userId, examId) {
        const attempt = await ExamAttempt.findOne({ userId, examId });
        if (attempt) {
            await QuestionStatus.deleteMany({ attemptId: attempt._id });
            await ExamAttempt.deleteOne({ _id: attempt._id });
        }
        return true;
    }
}

module.exports = new AttemptRepository();
