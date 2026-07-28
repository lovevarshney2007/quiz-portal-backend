const Exam = require('../models/Exam');

class ExamRepository {
    constructor() {
        this.pendingExams = {};
    }

    async create(examData) {
        return await Exam.create(examData);
    }

    async findById(id) {
        if (this.pendingExams[id]) return await this.pendingExams[id];
        
        this.pendingExams[id] = (async () => {
            const redisClient = require('../config/redis');
            const cacheKey = `exam_cache_${id}`;
            const cached = await redisClient.get(cacheKey).catch(()=>null);
            if (cached) {
                delete this.pendingExams[id];
                return JSON.parse(cached);
            }
            const exam = await Exam.findById(id).lean();
            if (exam) {
                await redisClient.set(cacheKey, JSON.stringify(exam), 'EX', 300).catch(()=>null);
            }
            delete this.pendingExams[id];
            return exam;
        })();
        
        return await this.pendingExams[id];
    }

    async findAll(filter = {}, sort = { createdAt: -1 }, skip = 0, limit = 10) {
        return await Exam.find(filter).sort(sort).skip(skip).limit(limit);
    }

    async update(id, updateData) {
        return await Exam.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    }

    async delete(id) {
        return await Exam.findByIdAndDelete(id);
    }

    async updateStatus(id, status) {
        return await Exam.findByIdAndUpdate(id, { status }, { new: true });
    }

    async countByFilter(filter = {}) {
        return await Exam.countDocuments(filter);
    }
}

module.exports = new ExamRepository();
