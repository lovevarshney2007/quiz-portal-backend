const userRepository = require('../repositories/user.repository');
const CustomError = require('../utils/customError');
const jwt = require('jsonwebtoken');

class AuthService {
    async verifyCaptcha(token) {
        if (!process.env.RECAPTCHA_SECRET_KEY) return true;
        
        try {
            const response = await fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`, {
                method: 'POST'
            });
            const data = await response.json();
            return data.success;
        } catch (error) {
            return false;
        }
    }

    async register(userData, captchaToken) {
        if (captchaToken) {
            const isCaptchaValid = await this.verifyCaptcha(captchaToken);
            if (!isCaptchaValid) throw new CustomError('Invalid captcha', 400);
        }

        const existingEmail = await userRepository.findByEmail(userData.email);
        if (existingEmail) throw new CustomError('Email already registered', 400);

        if (userData.role === 'Student') {
            const existingStudentNum = await userRepository.findByStudentNumber(userData.studentNumber);
            if (existingStudentNum) throw new CustomError('Student number already registered', 400);
        }

        const user = await userRepository.create(userData);
        user.password = undefined;
        return user;
    }

    async login(email, password, captchaToken) {
        if (captchaToken) {
            const isCaptchaValid = await this.verifyCaptcha(captchaToken);
            if (!isCaptchaValid) throw new CustomError('Invalid captcha', 400);
        }

        const user = await userRepository.findByEmail(email);
        if (!user) throw new CustomError('Invalid email or password', 401);

        const isMatch = await user.comparePassword(password);
        if (!isMatch) throw new CustomError('Invalid email or password', 401);

        const accessToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

        await userRepository.updateRefreshToken(user._id, refreshToken);

        user.password = undefined;
        return { user, accessToken, refreshToken };
    }

    async refreshToken(token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
            const user = await userRepository.findById(decoded.id);
            if (!user || user.refreshToken !== token) throw new CustomError('Invalid refresh token', 401);

            const accessToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
            const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

            await userRepository.updateRefreshToken(user._id, refreshToken);

            return { accessToken, refreshToken };
        } catch (error) {
            throw new CustomError('Invalid refresh token', 401);
        }
    }

    async logout(userId) {
        await userRepository.updateRefreshToken(userId, null);
    }
}

module.exports = new AuthService();
