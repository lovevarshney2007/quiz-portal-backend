const Result = require('../models/Result');

class ResultRepository {
    async createResult(resultData) {
        const result = new Result(resultData);
        return await result.save();
    }

    async findByStudentAndExam(studentId, examId) {
        return await Result.findOne({ student: studentId, exam: examId });
    }

    async findAllByExamId(examId) {
        return await Result.find({ exam: examId }).populate('student', 'name studentNumber email').sort({ totalScore: -1, completionTime: 1 });
    }

    async updateResult(id, updateData) {
        return await Result.findByIdAndUpdate(id, updateData, { new: true });
    }
}

module.exports = new ResultRepository();
