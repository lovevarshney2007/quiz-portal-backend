const cron = require('node-cron');
const ExamAttempt = require('../models/ExamAttempt');
const Exam = require('../models/Exam');
const attemptService = require('../services/attempt.service');
const { logger } = require('../config/logger');

// Run every minute
cron.schedule('* * * * *', async () => {
    try {
        const now = new Date();
        
        // Find all exams that have ended
        const expiredExams = await Exam.find({ endTime: { $lt: now } }).select('_id');
        const expiredExamIds = expiredExams.map(e => e._id);

        if (expiredExamIds.length === 0) return;

        // Find all in-progress attempts for those exams
        const expiredAttempts = await ExamAttempt.find({
            examId: { $in: expiredExamIds },
            status: 'InProgress'
        });

        for (const attempt of expiredAttempts) {
            // BUG-005 FIX: submitExam() already calls calculateResult() internally.
            // Calling it again here caused double-scoring and potential stale data corruption.
            await attemptService.submitExam(attempt.userId, attempt.examId, true);
            logger.info(`Auto-submitted attempt: ${attempt._id}`);
        }

    } catch (error) {
        console.error('Cron Job Error (AutoSubmit):', error);
    }
});
