const userRepository = require('../repositories/user.repository');
const CustomError = require('../utils/customError');
const jwt = require('jsonwebtoken');

class AuthService {
    async verifyCaptcha(token) {
        // reCAPTCHA is intentionally bypassed — set RECAPTCHA_ENABLED=true in .env to re-enable.
        if (process.env.RECAPTCHA_ENABLED !== 'true') return true;

        if (!process.env.RECAPTCHA_SECRET_KEY) return true;

        try {
            const response = await fetch(
                `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`,
                { method: 'POST' }
            );
            const data = await response.json();
            // Require both a successful response AND a score of at least 0.5 (v3 bots score low)
            return data.success === true && (data.score === undefined || data.score >= 0.5);
        } catch (error) {
            return false;
        }
    }

    async login(email, studentNumber, captchaToken) {
        if (captchaToken) {
            const isCaptchaValid = await this.verifyCaptcha(captchaToken);
            if (!isCaptchaValid) throw new CustomError('Invalid captcha', 400);
        }

        const user = await userRepository.findByEmail(email);
        if (!user) throw new CustomError('Invalid email or student number', 401);

        if (user.role === 'Student' && user.studentNumber !== studentNumber) {
            throw new CustomError('Invalid email or student number', 401);
        }

        const accessToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
        const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

        await userRepository.updateRefreshToken(user._id, refreshToken);

        return { user, accessToken, refreshToken };
    }

    async refreshToken(token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
            const user = await userRepository.findById(decoded.id);
            if (!user || user.refreshToken !== token) throw new CustomError('Invalid refresh token', 401);

            const accessToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
            const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

            await userRepository.updateRefreshToken(user._id, refreshToken);

            return { accessToken, refreshToken };
        } catch (error) {
            throw new CustomError('Invalid refresh token', 401);
        }
    }

    async logout(userId, token = null) {
        await userRepository.updateRefreshToken(userId, null);
        if (token) {
            try {
                const decoded = jwt.decode(token);
                if (decoded && decoded.exp) {
                    const redisClient = require('../config/redis');
                    const timeToExpire = decoded.exp - Math.floor(Date.now() / 1000);
                    if (timeToExpire > 0) {
                        await redisClient.set(`blacklist_${token}`, 'true', 'EX', timeToExpire);
                    }
                }
            } catch (err) {
                console.warn('Failed to blacklist JWT token on logout:', err.message);
            }
        }
    }
}

module.exports = new AuthService();
