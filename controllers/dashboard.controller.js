const Result = require('../models/Result');
const User = require('../models/User');
const Exam = require('../models/Exam');
const { catchAsync } = require('../middlewares/error.middleware');

const getAdminDashboardStats = catchAsync(async (req, res) => {
    const totalStudents = await User.countDocuments({ role: 'Student' });
    const totalExams = await Exam.countDocuments();
    const activeExams = await Exam.countDocuments({ status: 'Started' });
    const totalResults = await Result.countDocuments();

    res.status(200).json({
        status: 'success',
        data: {
            stats: {
                totalStudents,
                totalExams,
                activeExams,
                totalResults
            }
        }
    });
});

const getStudentDashboardStats = catchAsync(async (req, res) => {
    // Result schema uses 'student' and 'exam'
    const studentId = req.user._id;

    const completedExamsCount = await Result.countDocuments({ student: studentId });
    const results = await Result.find({ student: studentId }).populate('exam', 'title');

    let totalScore = 0;
    results.forEach(r => {
        totalScore += r.score;
    });
    
    const averageScore = completedExamsCount > 0 ? (totalScore / completedExamsCount) : 0;

    res.status(200).json({
        status: 'success',
        data: {
            stats: {
                completedExams: completedExamsCount,
                averageScore: Number(averageScore.toFixed(2)),
                recentResults: results.slice(0, 5) // Last 5 results
            }
        }
    });
});

module.exports = {
    getAdminDashboardStats,
    getStudentDashboardStats
};
