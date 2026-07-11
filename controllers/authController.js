const authService = require('../services/authService');
const { catchAsync } = require('../utils/catchAsync');

exports.register = catchAsync(async (req, res) => {
    const { captchaToken, ...userData } = req.body;
    const result = await authService.registerUser(userData, captchaToken);
    res.status(201).json({
        status: 'success',
        message: result.message
    });
});

exports.login = catchAsync(async (req, res) => {
    const { email, password, captchaToken } = req.body;
    const result = await authService.login(email, password, captchaToken);
    
    // Send refresh token in HTTP-only cookie
    res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({
        status: 'success',
        data: {
            user: result.user,
            accessToken: result.accessToken
        }
    });
});

exports.refreshToken = catchAsync(async (req, res) => {
    const token = req.cookies.refreshToken || req.body.refreshToken;
    if (!token) {
        return res.status(401).json({ status: 'error', message: 'No refresh token provided' });
    }

    const tokens = await authService.refreshToken(token);
    
    res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
        status: 'success',
        data: {
            accessToken: tokens.accessToken
        }
    });
});
