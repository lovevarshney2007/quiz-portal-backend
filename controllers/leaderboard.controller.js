const resultRepository = require('../repositories/result.repository');
const { catchAsync } = require('../middlewares/error.middleware');

const getLeaderboard = catchAsync(async (req, res) => {
    const { examId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 100;
    const redisClient = require('../config/redis');
    const User = require('../models/User');

    // 1. Fetch from Redis (ZREVRANGE returns highest scores first)
    const redisKey = `leaderboard:${examId}`;
    const topIds = await redisClient.zrevrange(redisKey, 0, limit - 1);
    
    let formattedLeaderboard = [];

    if (topIds && topIds.length > 0) {
        // Fetch users and results in parallel
        const users = await User.find({ _id: { $in: topIds } }).lean();
        const results = await resultRepository.findAll({ exam: examId, student: { $in: topIds } }, {}, 0, limit);
        
        const userMap = new Map(users.map(u => [u._id.toString(), u]));
        const resultMap = new Map(results.map(r => [r.student.toString(), r]));

        formattedLeaderboard = topIds.map(id => {
            const user = userMap.get(id);
            const r = resultMap.get(id);
            if (!user || !r) return null;
            return {
                studentId: user._id,
                name: user.name,
                studentNumber: user.studentNumber,
                score: r.totalScore,
                accuracy: r.accuracy,
                completionTime: r.completionTime || 0
            };
        }).filter(Boolean);
    } else {
        // Fallback to Mongo if Redis is cleared
        const leaderboard = await resultRepository.getExamLeaderboard(examId, limit);
        formattedLeaderboard = leaderboard
            .filter(r => r.student)
            .map(r => ({
                studentId: r.student._id,
                name: r.student.name,
                studentNumber: r.student.studentNumber,
                score: r.totalScore,
                accuracy: r.accuracy,
                completionTime: r.completionTime || 0
            }));
    }

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
