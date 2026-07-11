const jwt = require('jsonwebtoken');
const axios = require('axios');
const userRepository = require('../repositories/userRepository');

class AuthService {
    async verifyCaptcha(token) {
        if (!token) return false;
        try {
            const secretKey = process.env.RECAPTCHA_SECRET_KEY;
            // If secret is not configured, bypass for dev
            if (!secretKey) return true;

            const response = await axios.post(
                `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`
            );
            return response.data.success && response.data.score >= 0.5;
        } catch (error) {
            return false;
        }
    }

    generateTokens(userId, role) {
        const payload = { userId, role };
        const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
        return { accessToken, refreshToken };
    }

    async registerUser(userData, captchaToken) {
        const isHuman = await this.verifyCaptcha(captchaToken);
        if (!isHuman) {
            throw new Error('Captcha verification failed');
        }

        const existingUser = await userRepository.findByEmail(userData.email);
        if (existingUser) {
            throw new Error('User already exists with this email');
        }

        if (userData.role === 'Student') {
            const existingStudent = await userRepository.findByStudentNumber(userData.studentNumber);
            if (existingStudent) {
                throw new Error('Student number already registered');
            }
        }

        const user = await userRepository.createUser(userData);
        return { message: 'Registration successful. You can now login.' };
    }

    async login(email, password, captchaToken) {
        const isHuman = await this.verifyCaptcha(captchaToken);
        if (!isHuman) {
            throw new Error('Captcha verification failed');
        }

        const user = await userRepository.findByEmail(email);
        if (!user) {
            throw new Error('Invalid email or password');
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            throw new Error('Invalid email or password');
        }

        const { accessToken, refreshToken } = this.generateTokens(user._id, user.role);
        await userRepository.updateRefreshToken(user._id, refreshToken);

        return {
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                studentNumber: user.studentNumber
            },
            accessToken,
            refreshToken
        };
    }

    async refreshToken(token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
            const user = await userRepository.findById(decoded.userId);
            
            if (!user || user.refreshToken !== token) {
                throw new Error('Invalid refresh token');
            }

            const tokens = this.generateTokens(user._id, user.role);
            await userRepository.updateRefreshToken(user._id, tokens.refreshToken);
            
            return tokens;
        } catch (error) {
            throw new Error('Refresh token expired or invalid');
        }
    }
}

module.exports = new AuthService();
