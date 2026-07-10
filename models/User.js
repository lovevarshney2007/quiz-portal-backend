const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const ROLES = require('../constants/roles');

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true
    },
    studentNumber: {
        type: String,
        required: [true, 'Student number is required'],
        unique: true,
        trim: true,
        match: [/^25\d+$/, 'Student number must start with 25 and contain only digits']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^[\w-\.]+@akgec\.ac\.in$/, 'Please use a valid @akgec.ac.in email address']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 8,
        select: false // Do not return password by default
    },
    branch: {
        type: String,
        required: [true, 'Branch is required']
    },
    section: {
        type: String,
        required: [true, 'Section is required']
    },
    year: {
        type: String,
        required: [true, 'Year is required']
    },
    role: {
        type: String,
        enum: Object.values(ROLES),
        default: ROLES.STUDENT
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    refreshToken: String
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function() {
    if (!this.isModified('password')) return;
    
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
