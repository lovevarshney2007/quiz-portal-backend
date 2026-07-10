const Exam = require('../models/Exam');

class ExamRepository {
    async create(examData) {
        return await Exam.create(examData);
    }

    async findById(id) {
        return await Exam.findById(id);
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
}

module.exports = new ExamRepository();
