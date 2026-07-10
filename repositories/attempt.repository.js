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
}

module.exports = new AttemptRepository();
