const Redis = require('ioredis');

let redisConfig;
if (process.env.REDIS_URL) {
    // Render and many cloud providers supply a complete REDIS_URL
    redisConfig = process.env.REDIS_URL;
} else {
    redisConfig = {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
            if (times > 3) {
                return null; // Stop retrying after 3 attempts to avoid crash
            }
            return Math.min(times * 200, 2000);
        }
    };
}

const redisClient = new Redis(redisConfig);

redisClient.on('connect', () => {
    console.log('Redis connected successfully');
});

redisClient.on('error', (err) => {
    console.warn('Redis connection warning:', err.message || err);
});

// Attach redisConfig to the client so other modules can use the same connection parameters
redisClient.redisConfig = redisConfig;

module.exports = redisClient;
