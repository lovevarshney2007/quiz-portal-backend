const User = require('../models/User');

class UserRepository {
    constructor() {
        this.pendingUsers = {};
    }

    async create(userData) {
        const user = new User(userData);
        return await user.save();
    }

    async findByEmail(email) {
        return await User.findOne({ email });
    }

    async findById(id) {
        if (this.pendingUsers[id]) return await this.pendingUsers[id];
        
        this.pendingUsers[id] = (async () => {
            const redisClient = require('../config/redis');
            const cacheKey = `user_cache_${id}`;
            const cached = await redisClient.get(cacheKey).catch(() => null);
            if (cached) {
                delete this.pendingUsers[id];
                return JSON.parse(cached);
            }
            const user = await User.findById(id).lean();
            if (user) {
                await redisClient.set(cacheKey, JSON.stringify(user), 'EX', 3600).catch(() => null);
            }
            delete this.pendingUsers[id];
            return user;
        })();
        
        return await this.pendingUsers[id];
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
