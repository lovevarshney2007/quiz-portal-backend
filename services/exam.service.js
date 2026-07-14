const examRepository = require('../repositories/exam.repository');
const questionRepository = require('../repositories/question.repository');
const CustomError = require('../utils/customError');
const redisClient = require('../config/redis');

class ExamService {
    async createExam(examData, userId) {
        examData.createdBy = userId;
        return await examRepository.create(examData);
    }

    async getExamById(id) {
        const exam = await examRepository.findById(id);
        if (!exam) throw new CustomError('Exam not found', 404);
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
        if (!exam) throw new CustomError('Exam not found', 404);
        return exam;
    }

    async deleteExam(id) {
        const exam = await examRepository.delete(id);
        if (!exam) throw new CustomError('Exam not found', 404);
        await questionRepository.deleteByExamId(id);
        return true;
    }

    async publishExam(examId) {
        const exam = await this.getExamById(examId);
        if (exam.status !== 'Draft') throw new CustomError('Only draft exams can be published', 400);
        return await examRepository.updateStatus(examId, 'Published');
    }

    async startExam(examId) {
        const exam = await this.getExamById(examId);
        if (exam.status !== 'Published') throw new CustomError('Only published exams can be started', 400);
        const startedExam = await examRepository.updateStatus(examId, 'Started');
        // Redis caching logic can go here
        return startedExam;
    }

    async pauseExam(examId) {
        const exam = await this.getExamById(examId);
        if (exam.status !== 'Started') throw new CustomError('Only started exams can be paused', 400);
        return await examRepository.updateStatus(examId, 'Paused');
    }

    async resumeExam(examId) {
        const exam = await this.getExamById(examId);
        if (exam.status !== 'Paused') throw new CustomError('Only paused exams can be resumed', 400);
        return await examRepository.updateStatus(examId, 'Started');
    }

    async completeExam(examId) {
        const exam = await this.getExamById(examId);
        if (exam.status !== 'Started') throw new CustomError('Only started exams can be completed', 400);
        const completedExam = await examRepository.updateStatus(examId, 'Completed');
        // Add job to resultQueue here if BullMQ is set up
        return completedExam;
    }

    async archiveExam(examId) {
        const exam = await this.getExamById(examId);
        if (exam.status !== 'Completed') throw new CustomError('Only completed exams can be archived', 400);
        return await examRepository.updateStatus(examId, 'Archived');
    }

    async saveStudentResponse(examId, studentId, responses, violationCount) {
        const key = `exam_attempt:${examId}:${studentId}`;
        const data = { responses, violationCount, lastUpdated: new Date() };
        await redisClient.set(key, JSON.stringify(data));
        return data;
    }

    async getStudentExamState(examId, studentId) {
        const key = `exam_attempt:${examId}:${studentId}`;
        const data = await redisClient.get(key);
        return data ? JSON.parse(data) : null;
    }
}

module.exports = new ExamService();
