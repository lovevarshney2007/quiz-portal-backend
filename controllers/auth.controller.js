const authService = require('../services/auth.service');
const { catchAsync } = require('../middlewares/error.middleware');

const register = catchAsync(async (req, res) => {
    const { captchaToken, ...userData } = req.body;
    const user = await authService.register(userData, captchaToken);
    res.status(201).json({
        status: 'success',
        data: { user }
    });
});

const login = catchAsync(async (req, res) => {
    const { email, password, captchaToken } = req.body;
    const { user, accessToken, refreshToken } = await authService.login(email, password, captchaToken);
    
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({
        status: 'success',
        data: { user, accessToken }
    });
});

const refreshToken = catchAsync(async (req, res) => {
    const token = req.cookies.refreshToken || req.body.refreshToken;
    const tokens = await authService.refreshToken(token);

    res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
        status: 'success',
        data: { accessToken: tokens.accessToken }
    });
});

const logout = catchAsync(async (req, res) => {
    await authService.logout(req.user._id);
    res.clearCookie('refreshToken');
    res.status(200).json({
        status: 'success',
        message: 'Logged out successfully'
    });
});

const forgotPassword = catchAsync(async (req, res) => {
    await authService.forgotPassword(req.body.email, req.body.captchaToken);
    res.status(200).json({
        status: 'success',
        message: 'Token sent to email!'
    });
});

const resetPassword = catchAsync(async (req, res) => {
    await authService.resetPassword(req.params.token, req.body.password);
    res.status(200).json({
        status: 'success',
        message: 'Password reset successful!'
    });
});

module.exports = {
    register,
    login,
    refreshToken,
    logout,
    forgotPassword,
    resetPassword
};
