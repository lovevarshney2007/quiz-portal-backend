const Question = require('../models/Question');

class QuestionRepository {
    async createQuestion(questionData) {
        const question = new Question(questionData);
        return await question.save();
    }

    async insertMany(questionsData) {
        return await Question.insertMany(questionsData);
    }

    async findByExamId(examId) {
        return await Question.find({ exam: examId }).sort({ order: 1 });
    }

    async findById(id) {
        return await Question.findById(id);
    }

    async updateQuestion(id, updateData) {
        return await Question.findByIdAndUpdate(id, updateData, { new: true });
    }

    async deleteQuestion(id) {
        return await Question.findByIdAndDelete(id);
    }
}

module.exports = new QuestionRepository();
