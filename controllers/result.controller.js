const resultService = require('../services/result.service');
const { catchAsync } = require('../middlewares/error.middleware');

const generateResult = catchAsync(async (req, res) => {
    const { attemptId } = req.body;
    const result = await resultService.calculateResult(attemptId);
    
    res.status(201).json({
        status: 'success',
        data: { result }
    });
});

module.exports = { generateResult };
