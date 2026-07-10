const Question = require('../models/Question');

class QuestionRepository {
    async create(questionData) {
        return await Question.create(questionData);
    }

    async findByExamId(examId) {
        return await Question.find({ examId });
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
}

module.exports = new QuestionRepository();
