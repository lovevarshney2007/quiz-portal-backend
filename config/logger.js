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

if (process.env.NODE_ENV !== 'production') {
    const consoleFormat = winston.format.combine(winston.format.colorize(), winston.format.simple());
    logger.add(new winston.transports.Console({ format: consoleFormat }));
    authLogger.add(new winston.transports.Console({ format: consoleFormat }));
    adminLogger.add(new winston.transports.Console({ format: consoleFormat }));
    securityLogger.add(new winston.transports.Console({ format: consoleFormat }));
}

module.exports = {
    logger,
    authLogger,
    adminLogger,
    securityLogger
};
