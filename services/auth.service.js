const userRepository = require('../repositories/user.repository');
const CustomError = require('../utils/customError');
const { generateAccessToken, generateRefreshToken } = require('../helpers/jwt.helper');

class AuthService {
    async register(userData) {
        // Check for duplicate email
        const existingEmail = await userRepository.findByEmail(userData.email);
        if (existingEmail) {
            throw new CustomError('Email already registered', 400);
        }

        // Check for duplicate student number
        const existingStudentNum = await userRepository.findByStudentNumber(userData.studentNumber);
        if (existingStudentNum) {
            throw new CustomError('Student number already registered', 400);
        }

        const user = await userRepository.create(userData);
        
        // Remove password from output
        user.password = undefined;
        return user;
    }

    async login(email, password) {
        const user = await userRepository.findByEmail(email);
        if (!user) {
            throw new CustomError('Invalid email or password', 401);
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            throw new CustomError('Invalid email or password', 401);
        }

        const accessToken = generateAccessToken(user._id, user.role);
        const refreshToken = generateRefreshToken(user._id);

        await userRepository.updateRefreshToken(user._id, refreshToken);

        user.password = undefined;
        return { user, accessToken, refreshToken };
    }
}

module.exports = new AuthService();
