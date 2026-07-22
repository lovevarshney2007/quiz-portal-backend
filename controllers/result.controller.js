const resultService = require('../services/result.service');
const resultRepository = require('../repositories/result.repository');
const { catchAsync } = require('../middlewares/error.middleware');
const { Queue } = require('bullmq');
const redisClient = require('../config/redis');

const resultQueue = new Queue('resultQueue', {
    connection: redisClient.redisConfig
});

const generateResult = catchAsync(async (req, res) => {
    const { examId } = req.body;
    await resultQueue.add('generateResults', { examId });
    res.status(200).json({ status: 'success', message: 'Result generation started in background' });
});

const getExamResults = catchAsync(async (req, res) => {
    const results = await resultRepository.findByExamId(req.params.examId);
    res.status(200).json({ status: 'success', data: { results } });
});

module.exports = {
    generateResult,
    getExamResults
};
