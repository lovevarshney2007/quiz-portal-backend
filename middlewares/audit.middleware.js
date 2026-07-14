const { adminLogger } = require('../config/logger');

const auditLog = (action) => {
    return (req, res, next) => {
        // Run after the response is sent to ensure it was successful
        res.on('finish', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                adminLogger.info({
                    action,
                    adminId: req.user ? req.user._id : 'Unknown',
                    adminEmail: req.user ? req.user.email : 'Unknown',
                    method: req.method,
                    url: req.originalUrl,
                    target: req.params.id || 'N/A',
                    ip: req.ip || req.connection.remoteAddress
                });
            }
        });
        next();
    };
};

module.exports = auditLog;
