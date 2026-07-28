const { Queue } = require('bullmq');
const Redis = require('ioredis');
const redisClient = require('../config/redis');

// Centralize the dedicated BullMQ Redis connection to prevent TCP connection exhaustion.
const connection = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null
});

const resultQueue = new Queue('resultQueue', { connection });
const reportQueue = new Queue('reportQueue', { connection });
const syncQueue = new Queue('syncQueue', { connection });

module.exports = { 
    connection, 
    resultQueue, 
    reportQueue, 
    syncQueue 
};
