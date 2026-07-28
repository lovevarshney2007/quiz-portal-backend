const winston = require('winston');

const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    defaultMeta: { service: 'quiz-portal-backend' },
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' })
    ]
});

const authLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    transports: [new winston.transports.File({ filename: 'logs/auth.log' })]
});

const adminLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    transports: [new winston.transports.File({ filename: 'logs/admin-actions.log' })]
});

const securityLogger = winston.createLogger({
    level: 'warn',
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    transports: [new winston.transports.File({ filename: 'logs/security.log' })]
});

// Always log to console (Render, Railway, etc. only capture stdout/stderr)
// In production use JSON format for structured log aggregators.
const consoleTransport = process.env.NODE_ENV !== 'production'
    ? new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()) })
    : new winston.transports.Console({ format: winston.format.combine(winston.format.timestamp(), winston.format.json()) });

logger.add(consoleTransport);
// Note: authLogger, adminLogger, securityLogger only log to files in production to keep stdout clean.
if (process.env.NODE_ENV !== 'production') {
    const devFormat = winston.format.combine(winston.format.colorize(), winston.format.simple());
    authLogger.add(new winston.transports.Console({ format: devFormat }));
    adminLogger.add(new winston.transports.Console({ format: devFormat }));
    securityLogger.add(new winston.transports.Console({ format: devFormat }));
}

module.exports = {
    logger,
    authLogger,
    adminLogger,
    securityLogger
};
