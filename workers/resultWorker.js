const { Worker } = require('bullmq');
const { connection } = require('../queues/resultQueue');
const redisClient = require('../config/redis');
const examRepository = require('../repositories/exam.repository');
const questionRepository = require('../repositories/question.repository');
const resultRepository = require('../repositories/result.repository');
const { logger } = require('../config/logger');

const resultWorker = new Worker('resultQueue', async job => {
    if (job.name === 'generateResults') {
        const { examId } = job.data;
        logger.info(`Starting result generation for exam: ${examId}`);

        try {
            const exam = await examRepository.findById(examId);
            if (!exam) throw new Error('Exam not found');

            const attemptRepository = require('../repositories/attempt.repository');
            const resultService = require('../services/result.service');
            const attempts = await attemptRepository.findAttemptsByExamId(examId);

            for (const att of attempts) {
                if (att.status === 'Submitted' || att.status === 'AutoSubmitted') {
                    try {
                        await resultService.calculateResult(att._id);
                    } catch (err) {
                        logger.error(`Failed to generate result for attempt ${att._id}: ${err.message}`);
                    }
                }
            }

            logger.info(`Completed result generation for exam: ${examId}`);
        } catch (error) {
            logger.error(`Error generating results for exam ${examId}: ${error.message}`);
            throw error;
        }
    }
}, { connection });

resultWorker.on('completed', job => {
    logger.info(`Job ${job.id} has completed!`);
});

resultWorker.on('failed', (job, err) => {
    logger.error(`Job ${job.id} has failed with ${err.message}`);
});

module.exports = resultWorker;
