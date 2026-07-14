const redisClient = require('../config/redis');
const { securityLogger } = require('../config/logger');

const checkBlockedIp = async (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    
    try {
        const isBlocked = await redisClient.sismember('blocked_ips', ip);
        if (isBlocked) {
            securityLogger.warn({
                message: 'Blocked IP attempted access',
                ip,
                url: req.originalUrl
            });
            return res.status(403).json({
                status: 'fail',
                message: 'Access denied. Your IP has been blocked.'
            });
        }
        next();
    } catch (err) {
        // If Redis fails, log it but don't block traffic entirely unless strict mode is desired
        securityLogger.error(`Redis IP check failed: ${err.message}`);
        next();
    }
};

module.exports = checkBlockedIp;
