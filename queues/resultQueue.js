const { Queue } = require('bullmq');
const redisClient = require('../config/redis');

const connection = redisClient.redisConfig;

const resultQueue = new Queue('resultQueue', { connection });

module.exports = { resultQueue, connection };
