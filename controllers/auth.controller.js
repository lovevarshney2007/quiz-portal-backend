const authService = require('../services/auth.service');
const { catchAsync } = require('../middlewares/error.middleware');

const register = catchAsync(async (req, res) => {
    const user = await authService.register(req.body);
    res.status(201).json({
        status: 'success',
        data: { user }
    });
});

const login = catchAsync(async (req, res) => {
    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await authService.login(email, password);
    
    res.status(200).json({
        status: 'success',
        data: { user, accessToken, refreshToken }
    });
});

module.exports = {
    register,
    login
};
