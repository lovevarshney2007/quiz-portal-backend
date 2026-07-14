const userRepository = require('../repositories/user.repository');
const CustomError = require('../utils/customError');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const RegisteredStudent = require('../models/RegisteredStudent');
const sendEmail = require('../utils/email');

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

            // Pre-registration check
            const registeredStudent = await RegisteredStudent.findOne({ studentNumber: userData.studentNumber });
            if (!registeredStudent) {
                throw new CustomError('Student number is not pre-authorized for registration', 403);
            }
            if (registeredStudent.isRegistered) {
                throw new CustomError('This student number has already been registered', 400);
            }

            // Create user
            const user = await userRepository.create(userData);
            
            // Mark as registered in the authorized list
            registeredStudent.isRegistered = true;
            await registeredStudent.save();

            user.password = undefined;
            return user;
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

    async forgotPassword(email, captchaToken) {
        if (captchaToken) {
            const isCaptchaValid = await this.verifyCaptcha(captchaToken);
            if (!isCaptchaValid) throw new CustomError('Invalid captcha', 400);
        }

        const user = await userRepository.findByEmail(email);
        if (!user) {
            // Do not reveal whether user exists for security
            return;
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 mins

        await user.save({ validateBeforeSave: false });

        const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
        const message = `Forgot your password? Submit a PATCH request with your new password to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

        try {
            await sendEmail({
                email: user.email,
                subject: 'Your password reset token (valid for 10 min)',
                message
            });
        } catch (err) {
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            await user.save({ validateBeforeSave: false });
            throw new CustomError('There was an error sending the email. Try again later!', 500);
        }
    }

    async resetPassword(token, newPassword) {
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // Can't use userRepository here easily because we need to search by token, so let's use the model directly
        const User = require('../models/User');
        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            throw new CustomError('Token is invalid or has expired', 400);
        }

        user.password = newPassword;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        return user;
    }
}

module.exports = new AuthService();
