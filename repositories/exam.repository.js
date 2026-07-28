const Exam = require('../models/Exam');

class ExamRepository {
    async create(examData) {
        return await Exam.create(examData);
    }

    async findById(id) {
        const redisClient = require('../config/redis');
        const cacheKey = `exam_cache_${id}`;
        const cached = await redisClient.get(cacheKey).catch(() => null);
        if (cached) {
            return JSON.parse(cached);
        }
        const exam = await Exam.findById(id).lean();
        if (exam) {
            // Cache for 60 seconds - short enough that status changes propagate quickly
            await redisClient.set(cacheKey, JSON.stringify(exam), 'EX', 60).catch(() => null);
        }
        return exam;
    }

    async findAll(filter = {}, sort = { createdAt: -1 }, skip = 0, limit = 10) {
        return await Exam.find(filter).sort(sort).skip(skip).limit(limit);
    }

    async update(id, updateData) {
        const exam = await Exam.findByIdAndUpdate(id, updateData, { returnDocument: 'after', runValidators: true });
        if (exam) {
            const redisClient = require('../config/redis');
            await redisClient.del(`exam_cache_${id}`).catch(() => null);
        }
        return exam;
    }

    async delete(id) {
        const redisClient = require('../config/redis');
        await redisClient.del(`exam_cache_${id}`).catch(() => null);
        return await Exam.findByIdAndDelete(id);
    }

    async updateStatus(id, status) {
        const exam = await Exam.findByIdAndUpdate(id, { status }, { returnDocument: 'after' });
        if (exam) {
            const redisClient = require('../config/redis');
            await redisClient.del(`exam_cache_${id}`).catch(() => null);
        }
        return exam;
    }

    async countByFilter(filter = {}) {
        return await Exam.countDocuments(filter);
    }
}

module.exports = new ExamRepository();
