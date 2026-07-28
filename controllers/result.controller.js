const resultService = require('../services/result.service');
const resultRepository = require('../repositories/result.repository');
const { catchAsync } = require('../middlewares/error.middleware');
const { resultQueue } = require('../queues/resultQueue');

const generateResult = catchAsync(async (req, res) => {
    const { examId } = req.body;
    await resultQueue.add('generateResults', { examId });
    res.status(200).json({ status: 'success', message: 'Result generation started in background' });
});

const getExamResults = catchAsync(async (req, res) => {
    const rawResults = await resultRepository.findByExamId(req.params.examId);
    const results = rawResults.map((r, index) => ({
        ...r.toObject(),
        rank: index + 1,
        studentName: r.studentName || r.student?.name || r.student?.studentName || "Anonymous Candidate",
        studentNumber: r.studentNumber || r.student?.studentNumber || r.student?.rollNumber || "N/A",
        studentEmail: r.studentEmail || r.student?.email || ""
    }));
    res.status(200).json({ status: 'success', data: { results } });
});

module.exports = {
    generateResult,
    getExamResults
};
