const { Worker } = require('bullmq');
const redisClient = require('../config/redis');
const Attempt = require('../models/ExamAttempt');
const attemptRepository = require('../repositories/attempt.repository');

const syncWorker = new Worker('syncQueue', async job => {
    if (job.name === 'syncRedisToMongo') {
        const keys = await redisClient.keys('exam_attempt:*');
        
        for (const key of keys) {
            const parts = key.split(':');
            const examId = parts[1];
            const userId = parts[2];
            
            const existingDataStr = await redisClient.get(key);
            if (existingDataStr) {
                const state = JSON.parse(existingDataStr);
                const attempt = await attemptRepository.findAttemptByUserAndExam(userId, examId);
                
                if (attempt && attempt.status === 'InProgress') {
                    // Sync violations
                    attempt.tabSwitchCount = state.tabSwitchCount;
                    attempt.fullscreenExits = state.fullscreenExits;
                    await attempt.save();
                    
                    // Sync questions
                    const updates = Object.entries(state.questions).map(([qId, qData]) => {
                        return attemptRepository.updateQuestionStatus(attempt._id, qId, qData);
                    });
                    await Promise.all(updates);
                }
            }
        }
    }
}, {
    connection: redisClient.redisConfig
});

module.exports = syncWorker;
