const ExamAttempt = require('../models/ExamAttempt');
const QuestionStatus = require('../models/QuestionStatus');

class AttemptRepository {
    async createAttempt(attemptData) {
        return await ExamAttempt.create(attemptData);
    }

    async findAttemptByUserAndExam(userId, examId) {
        return await ExamAttempt.findOne({ userId, examId });
    }

    async findAttemptById(attemptId) {
        return await ExamAttempt.findById(attemptId);
    }

    async findAttemptsByExamId(examId) {
        return await ExamAttempt.find({ examId });
    }

    async updateAttempt(attemptId, updateData) {
        return await ExamAttempt.findByIdAndUpdate(attemptId, updateData, { new: true });
    }

    async getQuestionStatuses(attemptId) {
        return await QuestionStatus.find({ attemptId });
    }

    async updateQuestionStatus(attemptId, questionId, statusData) {
        return await QuestionStatus.findOneAndUpdate(
            { attemptId, questionId },
            statusData,
            { new: true, upsert: true } // Create if doesn't exist
        );
    }

    async deleteAttemptByUserAndExam(userId, examId) {
        const attempt = await ExamAttempt.findOne({ userId, examId });
        if (attempt) {
            await QuestionStatus.deleteMany({ attemptId: attempt._id });
            await ExamAttempt.deleteOne({ _id: attempt._id });
        }
        return true;
    }
}

module.exports = new AttemptRepository();
