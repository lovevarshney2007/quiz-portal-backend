const resultRepository = require('../repositories/result.repository');
const { catchAsync } = require('../middlewares/error.middleware');

const getLeaderboard = catchAsync(async (req, res) => {
    const { examId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 100;

    const leaderboard = await resultRepository.getExamLeaderboard(examId, limit);

    // Filter out missing student populates and map the output
    const formattedLeaderboard = leaderboard
        .filter(r => r.student)
        .map(r => ({
            studentId: r.student._id,
            name: r.student.name,
            studentNumber: r.student.studentNumber,
            score: r.score,
            accuracy: r.accuracy,
            completionTime: r.timeTaken || 0
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
