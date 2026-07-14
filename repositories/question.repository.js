const Question = require('../models/Question');

class QuestionRepository {
    async create(questionData) {
        return await Question.create(questionData);
    }

    // CRITICAL FIX: Query uses 'exam' field (matching Question.js schema), NOT 'examId'
    async findByExamId(examId) {
        return await Question.find({ exam: examId }).sort({ order: 1 });
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
