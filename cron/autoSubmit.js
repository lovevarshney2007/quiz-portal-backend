const cron = require('node-cron');
const ExamAttempt = require('../models/ExamAttempt');
const Exam = require('../models/Exam');
const attemptService = require('../services/attempt.service');
const resultService = require('../services/result.service');

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
            // Submit exam automatically
            await attemptService.submitExam(attempt.userId, attempt.examId, true);
            // Generate result
            await resultService.calculateResult(attempt._id);
            console.log(`Auto-submitted and generated result for attempt: ${attempt._id}`);
        }

    } catch (error) {
        console.error('Cron Job Error (AutoSubmit):', error);
    }
});
