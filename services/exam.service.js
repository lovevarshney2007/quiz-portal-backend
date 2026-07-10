const examRepository = require('../repositories/exam.repository');
const CustomError = require('../utils/customError');

class ExamService {
    async createExam(examData, userId) {
        examData.createdBy = userId;
        return await examRepository.create(examData);
    }

    async getExamById(id) {
        const exam = await examRepository.findById(id);
        if (!exam) {
            throw new CustomError('Exam not found', 404);
        }
        return exam;
    }

    async getAllExams(query) {
        const page = parseInt(query.page, 10) || 1;
        const limit = parseInt(query.limit, 10) || 10;
        const skip = (page - 1) * limit;

        const filter = {};
        if (query.status) filter.status = query.status;

        return await examRepository.findAll(filter, { createdAt: -1 }, skip, limit);
    }

    async updateExam(id, updateData) {
        const exam = await examRepository.update(id, updateData);
        if (!exam) {
            throw new CustomError('Exam not found', 404);
        }
        return exam;
    }

    async deleteExam(id) {
        const exam = await examRepository.delete(id);
        if (!exam) {
            throw new CustomError('Exam not found', 404);
        }
        return true;
    }
}

module.exports = new ExamService();
