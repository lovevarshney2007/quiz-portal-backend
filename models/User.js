const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['Admin', 'Student'],
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    studentNumber: {
        type: String,
        required: function() { return this.role === 'Student'; },
        validate: {
            validator: function(v) {
                // If admin, no validation needed
                if (this.role !== 'Student') return true;
                return /^25\d{5,6}$/.test(v);
            },
            message: props => `${props.value} is not a valid 2nd year student number!`
        }
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        validate: {
            validator: function(v) {
                if (this.role !== 'Student') {
                    // Admin email logic (could be anything or specific domain)
                    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
                }
                // Must end with @akgec.ac.in and contain studentNumber
                if (!v.endsWith('@akgec.ac.in')) return false;
                if (!this.studentNumber) return false;
                
                const emailPrefix = v.split('@')[0];
                return emailPrefix.includes(this.studentNumber);
            },
            message: props => `${props.value} is not a valid AKGEC email or does not match student number!`
        }
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
        select: false // Do not return by default
    },
    isVerified: {
        type: Boolean,
        default: true // Skipping OTP for now based on user instruction
    },
    suspiciousAttempts: {
        type: Number,
        default: 0
    },
    refreshToken: {
        type: String
    },
    passwordResetToken: String,
    passwordResetExpires: Date
}, { timestamps: true });

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
