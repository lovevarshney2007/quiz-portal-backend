const { Worker } = require('bullmq');
const Redis = require('ioredis');
const redisClient = require('../config/redis');
const Attempt = require('../models/ExamAttempt');
const attemptRepository = require('../repositories/attempt.repository');

const syncWorker = new Worker('syncQueue', async job => {
    if (job.name === 'syncRedisToMongo') {
        const hashKeys = await redisClient.keys('exam_attempt_hash:*');
        
        for (const key of hashKeys) {
            const parts = key.split(':');
            const examId = parts[1];
            const userId = parts[2];
            
            const hashData = await redisClient.hgetall(key);
            if (hashData && Object.keys(hashData).length > 0) {
                const attempt = await attemptRepository.findAttemptByUserAndExam(userId, examId);
                
                if (attempt && attempt.status === 'InProgress') {
                    if (hashData.meta) {
                        try {
                            const meta = JSON.parse(hashData.meta);
                            if (meta.tabSwitchCount !== undefined) attempt.tabSwitchCount = meta.tabSwitchCount;
                            if (meta.fullscreenExits !== undefined) attempt.fullscreenExits = meta.fullscreenExits;
                            await attempt.save();
                        } catch (parseErr) {
                            console.warn(`Failed to parse meta for attempt ${attempt._id}:`, parseErr.message);
                        }
                    }
                    
                    const updates = [];
                    for (const [field, valueStr] of Object.entries(hashData)) {
                        if (field.startsWith('q_')) {
                            try {
                                const qId = field.replace('q_', '');
                                const qData = JSON.parse(valueStr);
                                updates.push(attemptRepository.updateQuestionStatus(attempt._id, qId, qData));
                            } catch (parseErr) {
                                console.warn(`Failed to parse qData for field ${field}:`, parseErr.message);
                            }
                        }
                    }
                    await Promise.all(updates);
                }
            }
        }
    }
}, {
    connection: require('../queues/resultQueue').connection
});

module.exports = syncWorker;
