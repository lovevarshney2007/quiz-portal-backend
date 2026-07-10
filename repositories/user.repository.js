const User = require('../models/User');

class UserRepository {
    async findByEmail(email) {
        return await User.findOne({ email }).select('+password');
    }

    async findByStudentNumber(studentNumber) {
        return await User.findOne({ studentNumber });
    }

    async findById(id) {
        return await User.findById(id);
    }

    async create(userData) {
        const user = new User(userData);
        return await user.save();
    }

    async updateRefreshToken(userId, token) {
        return await User.findByIdAndUpdate(userId, { refreshToken: token }, { new: true });
    }
}

module.exports = new UserRepository();
