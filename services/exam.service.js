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

    async getAllExams(query, userRole) {
        const page = parseInt(query.page, 10) || 1;
        const limit = parseInt(query.limit, 10) || 10;
        const skip = (page - 1) * limit;

        const filter = {};
        if (query.status) {
            filter.status = query.status;
        } else if (userRole === 'Student') {
            filter.status = { $in: ['Draft', 'Published', 'Started', 'Paused', 'Completed'] };
        }

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
        return completedExam;
    }

    async archiveExam(examId) {
        const exam = await this.getExamById(examId);
        if (exam.status !== 'Completed') throw new CustomError('Only completed exams can be archived', 400);
        return await examRepository.updateStatus(examId, 'Archived');
    }

    async extendExam(examId, extraMinutes) {
        const exam = await this.getExamById(examId);
        if (exam.status === 'Completed' || exam.status === 'Archived') {
            throw new CustomError('Cannot extend a completed or archived exam', 400);
        }
        
        const newEndTime = new Date(exam.endTime.getTime() + extraMinutes * 60000);
        const newDuration = exam.duration + extraMinutes;
        
        return await examRepository.update(examId, { endTime: newEndTime, duration: newDuration });
    }

    async duplicateExam(examId, userId) {
        const exam = await this.getExamById(examId);
        const examData = exam.toObject();
        delete examData._id;
        delete examData.createdAt;
        delete examData.updatedAt;
        
        examData.title = `${examData.title} (Copy)`;
        examData.status = 'Draft';
        examData.createdBy = userId;
        
        const newExam = await examRepository.create(examData);
        
        // Clone all questions
        const questions = await questionRepository.findByExamId(examId);
        if (questions.length > 0) {
            const newQuestions = questions.map(q => {
                const qObj = q.toObject();
                delete qObj._id;
                delete qObj.createdAt;
                delete qObj.updatedAt;
                qObj.exam = newExam._id;
                return qObj;
            });
            await questionRepository.insertMany(newQuestions);
        }
        
        return newExam;
    }

    async forceSubmit(examId, studentIdentifier) {
        const attemptService = require('./attempt.service');
        const mongoose = require('mongoose');
        
        let userId = studentIdentifier;
        if (!mongoose.Types.ObjectId.isValid(studentIdentifier)) {
            const User = require('../models/User');
            const user = await User.findOne({ studentNumber: studentIdentifier });
            if (!user) {
                const CustomError = require('../utils/customError');
                throw new CustomError('Student not found', 404);
            }
            userId = user._id;
        }

        return await attemptService.submitExam(userId, examId, true);
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

    async getLiveStudents(examId) {
        const ExamAttempt = require('../models/ExamAttempt');
        const QuestionStatus = require('../models/QuestionStatus');
        
        let query = { status: 'InProgress' };
        if (examId && examId !== 'all' && examId !== 'undefined' && examId !== 'null') {
            query.examId = examId;
        }

        const attempts = await ExamAttempt.find(query)
            .populate('userId', 'name studentNumber rollNumber email branch section')
            .populate('examId', 'title duration totalQuestions');

        const liveStudents = await Promise.all(attempts.map(async (att) => {
            const statuses = await QuestionStatus.find({ attemptId: att._id });
            const answeredCount = statuses.filter(s => 
                s.status === 'Answered' || 
                s.status === 'AnsweredMarkedForReview' || 
                (s.givenAnswer && (Array.isArray(s.givenAnswer) ? s.givenAnswer.length > 0 : String(s.givenAnswer).trim() !== ''))
            ).length;

            const student = att.userId || {};
            const exam = att.examId || {};

            return {
                attemptId: att._id,
                studentId: student._id || att.userId,
                studentName: student.name || 'Unknown Student',
                studentNumber: student.studentNumber || student.rollNumber || 'N/A',
                email: student.email || 'N/A',
                examId: exam._id || att.examId,
                examTitle: exam.title || 'Live Exam',
                totalQuestions: exam.totalQuestions || 0,
                startTime: att.startTime,
                status: att.status,
                answeredCount,
                tabSwitchCount: att.tabSwitchCount || 0,
                fullscreenExits: att.fullscreenExits || 0
            };
        }));

        return liveStudents;
    }
}

module.exports = new ExamService();
