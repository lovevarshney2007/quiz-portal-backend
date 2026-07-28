const { Worker } = require('bullmq');
const { connection } = require('../queues/resultQueue');
const redisClient = require('../config/redis');
const examRepository = require('../repositories/exam.repository');
const questionRepository = require('../repositories/question.repository');
const resultRepository = require('../repositories/result.repository');
const { logger } = require('../config/logger');

const resultWorker = new Worker('resultQueue', async job => {
    if (job.name === 'generateResults') {
        const { examId, attemptId } = job.data;
        logger.info(`Starting result generation for exam: ${examId} attempt: ${attemptId || 'ALL'}`);

        try {
            const exam = await examRepository.findById(examId);
            if (!exam) throw new Error('Exam not found');

            const attemptRepository = require('../repositories/attempt.repository');
            const resultService = require('../services/result.service');

            if (attemptId) {
                // Generate for a single attempt (O(1) submission)
                await resultService.calculateResult(attemptId);
            } else {
                // Fallback: Generate for all attempts (Admin bulk action)
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
            }

            logger.info(`Completed result generation for exam: ${examId} attempt: ${attemptId || 'ALL'}`);
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
