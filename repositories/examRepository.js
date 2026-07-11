const Exam = require('../models/Exam');

class ExamRepository {
    async createExam(examData) {
        const exam = new Exam(examData);
        return await exam.save();
    }

    async findById(id) {
        return await Exam.findById(id);
    }

    async updateStatus(id, status) {
        return await Exam.findByIdAndUpdate(id, { status }, { new: true });
    }

    async updateExam(id, updateData) {
        return await Exam.findByIdAndUpdate(id, updateData, { new: true });
    }

    async deleteExam(id) {
        return await Exam.findByIdAndDelete(id);
    }

    async findAllExams(filter = {}) {
        return await Exam.find(filter).sort({ createdAt: -1 });
    }
}

module.exports = new ExamRepository();
