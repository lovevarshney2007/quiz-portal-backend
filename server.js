require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { logger } = require('./config/logger');
const { initSocket } = require('./socket');

const PORT = process.env.PORT || 5000;

// Create HTTP Server
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

const resultWorker = require('./workers/resultWorker');
const syncWorker = require('./workers/syncWorker');
const reportWorker = require('./workers/reportWorker');
const { connection: redisBullConnection } = require('./queues/resultQueue');
const redisClient = require('./config/redis');
const mongoose = require('mongoose');

// Connect to Database and start server
connectDB().then(() => {
    server.listen(PORT, () => {
        logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
}).catch(err => {
    logger.error(`Failed to connect to database. Server not started. Error: ${err.message}`);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    logger.error(`Unhandled Rejection Error: ${err.message}`);
});

// --- GRACEFUL SHUTDOWN ---
const gracefulShutdown = async (signal) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    
    // Stop accepting new HTTP requests
    server.close(async (err) => {
        if (err) {
            logger.error(`Error closing HTTP server: ${err.message}`);
        } else {
            logger.info('HTTP server closed.');
        }

        try {
            // Wait for BullMQ active jobs to finish
            logger.info('Closing background workers...');
            await Promise.all([
                resultWorker.close(),
                syncWorker.close(),
                reportWorker.close()
            ]);
            logger.info('Workers closed.');

            // Close Redis connections
            await redisBullConnection.quit();
            await redisClient.quit();
            logger.info('Redis connections closed.');

            // Close Mongoose connection
            await mongoose.connection.close(false);
            logger.info('MongoDB connection closed.');

            process.exit(0);
        } catch (closeErr) {
            logger.error(`Error during shutdown sequence: ${closeErr.message}`);
            process.exit(1);
        }
    });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
