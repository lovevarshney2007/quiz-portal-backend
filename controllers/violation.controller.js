const violationService = require('../services/violation.service');
const { catchAsync } = require('../middlewares/error.middleware');

const reportViolation = catchAsync(async (req, res) => {
    const { examId, type, browser, device } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    
    const result = await violationService.reportViolation(req.user._id, examId, {
        type, browser, device, ip
    });
    
    res.status(200).json({ status: 'success', data: result });
});

const getExamViolations = catchAsync(async (req, res) => {
    const violations = await violationService.getExamViolations(req.params.examId);
    res.status(200).json({ status: 'success', data: { violations } });
});

module.exports = {
    reportViolation,
    getExamViolations
};
