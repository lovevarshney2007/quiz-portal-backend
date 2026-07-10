const resultRepository = require('../repositories/result.repository');
const { catchAsync } = require('../middlewares/error.middleware');

const getLeaderboard = catchAsync(async (req, res) => {
    const { examId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 100;

    const leaderboard = await resultRepository.getExamLeaderboard(examId, limit);

    // Calculate Ranks dynamically
    const rankedLeaderboard = leaderboard.map((result, index) => {
        return {
            rank: index + 1,
            studentName: result.userId.fullName,
            studentNumber: result.userId.studentNumber,
            branch: result.userId.branch,
            section: result.userId.section,
            year: result.userId.year,
            score: result.score,
            accuracy: result.accuracy,
            timeTaken: result.timeTaken
        };
    });

    res.status(200).json({
        status: 'success',
        results: rankedLeaderboard.length,
        data: { leaderboard: rankedLeaderboard }
    });
});

module.exports = { getLeaderboard };
