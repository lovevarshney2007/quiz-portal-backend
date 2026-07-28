const Question = require('../models/Question');

class QuestionRepository {
    constructor() {
        this.pendingQuestions = {};
    }

    async create(questionData) {
        return await Question.create(questionData);
    }

    async findByExamId(examId) {
        if (this.pendingQuestions[examId]) return await this.pendingQuestions[examId];
        
        this.pendingQuestions[examId] = (async () => {
            const redisClient = require('../config/redis');
            const cacheKey = `questions_exam_${examId}`;
            const cached = await redisClient.get(cacheKey).catch(()=>null);
            if (cached) {
                delete this.pendingQuestions[examId];
                return JSON.parse(cached);
            }
            const questions = await Question.find({ exam: examId }).sort({ order: 1 }).lean();
            if (questions && questions.length > 0) {
                await redisClient.set(cacheKey, JSON.stringify(questions), 'EX', 3600).catch(()=>null);
            }
            delete this.pendingQuestions[examId];
            return questions;
        })();
        
        return await this.pendingQuestions[examId];
    }

    async findById(id) {
        return await Question.findById(id);
    }

    async update(id, updateData) {
        return await Question.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    }

    async delete(id) {
        return await Question.findByIdAndDelete(id);
    }

    async insertMany(questionsData) {
        return await Question.insertMany(questionsData);
    }

    async countByExamId(examId) {
        return await Question.countDocuments({ exam: examId });
    }

    async deleteByExamId(examId) {
        return await Question.deleteMany({ exam: examId });
    }
}

module.exports = new QuestionRepository();
