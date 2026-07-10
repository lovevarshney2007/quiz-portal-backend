const { verifyToken } = require('../helpers/jwt.helper');
const CustomError = require('../utils/customError');
const { catchAsync } = require('./error.middleware');
const userRepository = require('../repositories/user.repository');

const protect = catchAsync(async (req, res, next) => {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return next(new CustomError('You are not logged in! Please log in to get access.', 401));
    }

    try {
        const decoded = verifyToken(token, process.env.JWT_SECRET);
        
        const currentUser = await userRepository.findById(decoded.id);
        if (!currentUser) {
            return next(new CustomError('The user belonging to this token no longer exists.', 401));
        }

        req.user = currentUser;
        next();
    } catch (error) {
        return next(new CustomError('Invalid or expired token', 401));
    }
});

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(new CustomError('You do not have permission to perform this action', 403));
        }
        next();
    };
};

module.exports = { protect, authorize };
