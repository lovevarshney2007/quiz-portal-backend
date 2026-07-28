const { Queue } = require('bullmq');
const Redis = require('ioredis');
const redisClient = require('../config/redis');

// Centralize the dedicated BullMQ Redis connection to prevent TCP connection exhaustion.
const connection = new Redis(redisClient.redisConfig, { maxRetriesPerRequest: null });

const resultQueue = new Queue('resultQueue', { connection });
const reportQueue = new Queue('reportQueue', { connection });
const syncQueue = new Queue('syncQueue', { connection });

module.exports = { 
    connection, 
    resultQueue, 
    reportQueue, 
    syncQueue 
};
