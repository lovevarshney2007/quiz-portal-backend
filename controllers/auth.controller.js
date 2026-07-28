const authService = require('../services/auth.service');
const { catchAsync } = require('../middlewares/error.middleware');

/**
 * Shared cookie options factory.
 * Secure flag is only set in production so local dev (HTTP) still works.
 */
const cookieOptions = (maxAgeMs) => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: maxAgeMs
});

const login = catchAsync(async (req, res) => {
    const { email, studentNumber, captchaToken } = req.body;
    const { user, accessToken, refreshToken } = await authService.login(email, studentNumber, captchaToken);

    // gdg_token — short-lived access token (1 day)
    res.cookie('gdg_token', accessToken, cookieOptions(24 * 60 * 60 * 1000));

    // gdg_refresh_token — long-lived refresh token (7 days)
    res.cookie('gdg_refresh_token', refreshToken, cookieOptions(7 * 24 * 60 * 60 * 1000));

    res.status(200).json({
        status: 'success',
        data: {
            user,
            // Still returned in body for clients using Bearer header auth
            accessToken
        }
    });
});

const refreshToken = catchAsync(async (req, res) => {
    // Accept cookie or explicit body token for backward compatibility
    const token = req.cookies.gdg_refresh_token || req.cookies.refreshToken || req.body.refreshToken;
    const tokens = await authService.refreshToken(token);

    res.cookie('gdg_token', tokens.accessToken, cookieOptions(24 * 60 * 60 * 1000));
    res.cookie('gdg_refresh_token', tokens.refreshToken, cookieOptions(7 * 24 * 60 * 60 * 1000));

    res.status(200).json({
        status: 'success',
        data: { accessToken: tokens.accessToken }
    });
});

const logout = catchAsync(async (req, res) => {
    const token = req.cookies.gdg_token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    await authService.logout(req.user._id, token);

    // Clear both cookies — options must match the Set-Cookie options (except maxAge/expires)
    const clearOpts = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax'
    };
    res.clearCookie('gdg_token', clearOpts);
    res.clearCookie('gdg_refresh_token', clearOpts);
    // Also clear old cookie name in case client still has it
    res.clearCookie('refreshToken', clearOpts);

    res.status(200).json({
        status: 'success',
        message: 'Logged out successfully'
    });
});

module.exports = {
    login,
    refreshToken,
    logout
};
