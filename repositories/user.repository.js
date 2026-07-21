const User = require('../models/User');

class UserRepository {
    async create(userData) {
        const user = new User(userData);
        return await user.save();
    }

    async findByEmail(email) {
        return await User.findOne({ email });
    }

    async findById(id) {
        return await User.findById(id);
    }

    async findByStudentNumber(studentNumber) {
        return await User.findOne({ studentNumber });
    }

    async updateRefreshToken(userId, token) {
        return await User.findByIdAndUpdate(userId, { refreshToken: token }, { new: true });
    }

    async countByFilter(filter = {}) {
        return await User.countDocuments(filter);
    }
}

module.exports = new UserRepository();
