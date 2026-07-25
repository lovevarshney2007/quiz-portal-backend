const resultRepository = require('../repositories/result.repository');
const { catchAsync } = require('../middlewares/error.middleware');

const getLeaderboard = catchAsync(async (req, res) => {
    const { examId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 100;

    // Always fetch from MongoDB to ensure complete student details and accurate ranking
    const leaderboardResults = await resultRepository.getExamLeaderboard(examId, limit);

    const formattedLeaderboard = leaderboardResults.map((r, index) => ({
        rank: index + 1,
        resultId: r._id,
        studentId: r.student?._id || r.student || r._id,
        name: r.studentName || r.student?.name || r.student?.studentName || "Anonymous Candidate",
        studentNumber: r.studentNumber || r.student?.studentNumber || r.student?.rollNumber || "N/A",
        email: r.studentEmail || r.student?.email || "",
        score: r.totalScore || 0,
        maxScore: r.maxScore || 100,
        accuracy: r.accuracy || 0,
        completionTime: r.completionTime || 0,
        submittedAt: r.createdAt || r.updatedAt || new Date(),
        violationCount: r.violationCount || 0,
        isSuspicious: r.isSuspicious || false
    }));

    res.status(200).json({
        status: 'success',
        data: {
            leaderboard: formattedLeaderboard
        }
    });
});

module.exports = {
    getLeaderboard
};
