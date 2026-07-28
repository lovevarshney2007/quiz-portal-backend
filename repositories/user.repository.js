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
        const redisClient = require('../config/redis');
        const cacheKey = `user_cache_${id}`;
        const cached = await redisClient.get(cacheKey).catch(() => null);
        if (cached) {
            return JSON.parse(cached);
        }
        const user = await User.findById(id).lean();
        if (user) {
            await redisClient.set(cacheKey, JSON.stringify(user), 'EX', 3600).catch(() => null);
        }
        return user;
    }

    async findByStudentNumber(studentNumber) {
        return await User.findOne({ studentNumber });
    }

    async updateRefreshToken(userId, token) {
        // Invalidate cache on update so the next findById gets fresh data
        const redisClient = require('../config/redis');
        await redisClient.del(`user_cache_${userId}`).catch(() => null);
        return await User.findByIdAndUpdate(userId, { refreshToken: token }, { returnDocument: 'after' });
    }

    async countByFilter(filter = {}) {
        return await User.countDocuments(filter);
    }
}

module.exports = new UserRepository();
