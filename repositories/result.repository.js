const Result = require('../models/Result');
require('../models/User');
require('../models/Exam');

class ResultRepository {
    async create(resultData) {
        return await Result.create(resultData);
    }

    async createOrUpdate(resultData) {
        return await Result.findOneAndUpdate(
            { student: resultData.student, exam: resultData.exam },
            resultData,
            { returnDocument: 'after', upsert: true }
        );
    }

    async findByAttemptId(attemptId) {
        return await Result.findOne({ attemptId });
    }

    // CRITICAL FIX: Uses 'student' and 'exam' fields (matching Result.js schema)
    async findByStudentAndExam(studentId, examId) {
        return await Result.findOne({ student: studentId, exam: examId });
    }

    async findByExamId(examId) {
        return await Result.find({ exam: examId })
            .populate('student', 'name studentNumber email')
            .sort({ totalScore: -1, completionTime: 1 });
    }

    // CRITICAL FIX: Populates 'student' not 'userId', queries 'exam' not 'examId'
    async getExamLeaderboard(examId, limit = 100) {
        return await Result.find({ exam: examId })
            .sort({ totalScore: -1, completionTime: 1 })
            .limit(limit)
            .populate('student', 'name studentNumber email');
    }

    async countByFilter(filter = {}) {
        return await Result.countDocuments(filter);
    }
}

module.exports = new ResultRepository();
