const { Queue } = require('bullmq');
const Redis = require('ioredis');
const redisClient = require('../config/redis');

const connection = new Redis(redisClient.redisConfig, { maxRetriesPerRequest: null });

const resultQueue = new Queue('resultQueue', { connection });

module.exports = { resultQueue, connection };
