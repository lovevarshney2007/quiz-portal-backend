const Result = require('../models/Result');

class ResultRepository {
    async create(resultData) {
        return await Result.create(resultData);
    }

    async findByAttemptId(attemptId) {
        return await Result.findOne({ attemptId });
    }

    async findByExamAndUser(examId, userId) {
        return await Result.findOne({ examId, userId });
    }

    async getExamLeaderboard(examId, limit = 100) {
        return await Result.find({ examId })
            .sort({ score: -1, timeTaken: 1 })
            .limit(limit)
            .populate('userId', 'fullName studentNumber branch section year');
    }
}

module.exports = new ResultRepository();
