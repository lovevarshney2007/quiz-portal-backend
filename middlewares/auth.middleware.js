const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/user.repository');

/**
 * protect — verifies the JWT from:
 *   1. HttpOnly cookie  `gdg_token`          (preferred — set by login)
 *   2. HttpOnly cookie  `accessToken`        (legacy name, backward compat)
 *   3. Authorization: Bearer <token>         (for mobile / Postman clients)
 *
 * Attaches the full user document to req.user on success.
 */
exports.protect = async (req, res, next) => {
    try {
        let token;

        if (req.cookies && req.cookies.gdg_token) {
            // Primary: new cookie name
            token = req.cookies.gdg_token;
        } else if (req.cookies && req.cookies.accessToken) {
            // Legacy cookie name — kept for backward compatibility
            token = req.cookies.accessToken;
        } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            // Fallback: Authorization header (Postman, mobile, etc.)
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ status: 'error', message: 'You are not logged in!' });
        }

        // Check if token is blacklisted in Redis
        const redisClient = require('../config/redis');
        const isBlacklisted = await redisClient.get(`blacklist_${token}`);
        if (isBlacklisted) {
            return res.status(401).json({ status: 'error', message: 'Session expired. Please log in again.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userRepository.findById(decoded.id);

        if (!user) {
            return res.status(401).json({ status: 'error', message: 'User no longer exists.' });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ status: 'error', message: 'Invalid or expired token.' });
    }
};

/**
 * restrictTo — verifies req.user.role is in the allowed roles list.
 * Must be used AFTER protect.
 * Returns 403 Forbidden (not 401) so the frontend knows to redirect to an access-denied page.
 */
exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                status: 'error',
                message: 'You do not have permission to perform this action'
            });
        }
        next();
    };
};

// Alias kept for backward compatibility with existing route files
exports.authorize = (...roles) => exports.restrictTo(...roles);
