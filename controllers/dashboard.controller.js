const User = require('../models/User');
const Exam = require('../models/Exam');
const Result = require('../models/Result');
const { catchAsync } = require('../middlewares/error.middleware');

const getAdminDashboardStats = catchAsync(async (req, res) => {
    const totalStudents = await User.countDocuments({ role: 'Student' });
    const totalExams = await Exam.countDocuments();
    const activeExams = await Exam.countDocuments({ status: 'Published' });
    const recentExams = await Exam.find().sort({ createdAt: -1 }).limit(5);

    res.status(200).json({
        status: 'success',
        data: {
            stats: {
                totalStudents,
                totalExams,
                activeExams
            },
            recentExams
        }
    });
});

const getStudentDashboardStats = catchAsync(async (req, res) => {
    const userId = req.user._id;

    const myResults = await Result.find({ userId })
        .populate('examId', 'title startTime endTime maximumMarks')
        .sort({ createdAt: -1 });

    const upcomingExams = await Exam.find({ 
        status: 'Published', 
        startTime: { $gt: new Date() } 
    }).sort({ startTime: 1 }).limit(5);

    res.status(200).json({
        status: 'success',
        data: {
            resultsCount: myResults.length,
            myResults,
            upcomingExams
        }
    });
});

module.exports = {
    getAdminDashboardStats,
    getStudentDashboardStats
};
