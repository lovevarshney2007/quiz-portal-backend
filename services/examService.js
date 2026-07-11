const examRepository = require('../repositories/examRepository');
const redisClient = require('../config/redis');

class ExamService {
    async createExam(examData) {
        // Business logic validations can be added here
        return await examRepository.createExam(examData);
    }

    async getExamDetails(examId) {
        const exam = await examRepository.findById(examId);
        if (!exam) throw new Error('Exam not found');
        return exam;
    }

    async publishExam(examId) {
        const exam = await examRepository.findById(examId);
        if (!exam) throw new Error('Exam not found');
        
        if (exam.status !== 'Draft') {
            throw new Error('Only draft exams can be published');
        }
        
        return await examRepository.updateStatus(examId, 'Published');
    }

    async startExam(examId) {
        // This is admin action to open the exam for students
        const exam = await examRepository.updateStatus(examId, 'Started');
        
        // Cache exam status in Redis
        await redisClient.set(`exam_status:${examId}`, 'Started');
        
        return exam;
    }

    async pauseExam(examId) {
        const exam = await examRepository.updateStatus(examId, 'Paused');
        await redisClient.set(`exam_status:${examId}`, 'Paused');
        return exam;
    }

    async completeExam(examId) {
        const exam = await examRepository.updateStatus(examId, 'Completed');
        await redisClient.set(`exam_status:${examId}`, 'Completed');
        
        // Trigger BullMQ job to calculate results
        const { resultQueue } = require('../queues/resultQueue');
        await resultQueue.add('generateResults', { examId });
        
        return exam;
    }

    // Student Exam Flow Helper
    async getStudentExamState(examId, studentId) {
        // Get autosaved responses from Redis
        const cachedData = await redisClient.get(`exam_attempt:${examId}:${studentId}`);
        if (cachedData) {
            return JSON.parse(cachedData);
        }
        return null;
    }

    async saveStudentResponse(examId, studentId, responses, violationCount) {
        // Autosave in Redis
        const dataToSave = {
            responses,
            violationCount,
            lastSavedAt: Date.now()
        };
        await redisClient.set(`exam_attempt:${examId}:${studentId}`, JSON.stringify(dataToSave));
    }
}

module.exports = new ExamService();
