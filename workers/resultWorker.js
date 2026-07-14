const { Worker } = require('bullmq');
const { connection } = require('../queues/resultQueue');
const redisClient = require('../config/redis');
const examRepository = require('../repositories/exam.repository');
const questionRepository = require('../repositories/question.repository');
const resultRepository = require('../repositories/result.repository');
const logger = require('../config/logger');

const resultWorker = new Worker('resultQueue', async job => {
    if (job.name === 'generateResults') {
        const { examId } = job.data;
        logger.info(`Starting result generation for exam: ${examId}`);

        try {
            const exam = await examRepository.findById(examId);
            if (!exam) throw new Error('Exam not found');

            const questions = await questionRepository.findByExamId(examId);
            const questionMap = new Map();
            questions.forEach(q => questionMap.set(q._id.toString(), q));

            let cursor = '0';
            const keysToProcess = [];
            do {
                const [newCursor, keys] = await redisClient.scan(cursor, 'MATCH', `exam_attempt:${examId}:*`);
                cursor = newCursor;
                keysToProcess.push(...keys);
            } while (cursor !== '0');

            for (const key of keysToProcess) {
                const studentId = key.split(':')[2];
                const attemptData = JSON.parse(await redisClient.get(key));

                let totalScore = 0;
                let correctAnswers = 0;
                let wrongAnswers = 0;
                let skippedQuestions = 0;

                const responses = attemptData.responses || [];

                responses.forEach(resp => {
                    const q = questionMap.get(resp.questionId.toString());
                    if (!q) return;

                    if (!resp.markedAnswer) {
                        skippedQuestions++;
                    } else if (resp.markedAnswer === q.correctAnswer) {
                        correctAnswers++;
                        totalScore += q.marks;
                        resp.isCorrect = true;
                    } else {
                        wrongAnswers++;
                        resp.isCorrect = false;
                    }
                });

                const totalQuestions = questions.length;
                const maxScore = exam.totalMarks;
                const accuracy = totalQuestions > 0 ? ((correctAnswers / totalQuestions) * 100).toFixed(2) : 0;
                const percentage = maxScore > 0 ? ((totalScore / maxScore) * 100).toFixed(2) : 0;

                const result = {
                    student: studentId,
                    exam: examId,
                    totalQuestions,
                    correctAnswers,
                    wrongAnswers,
                    skippedQuestions,
                    totalScore,
                    maxScore,
                    accuracy,
                    percentage,
                    completionTime: 0, 
                    violationCount: attemptData.violationCount || 0,
                    isSuspicious: (attemptData.violationCount || 0) > 5,
                    responses
                };

                await resultRepository.create(result);
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
