const mongoose = require('mongoose');
const { EXAM_STATUS } = require('../constants/exam');

const examSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Exam title is required'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Exam description is required']
    },
    instructions: {
        type: String,
        required: [true, 'Exam instructions are required']
    },
    startTime: {
        type: Date,
        required: [true, 'Start time is required']
    },
    endTime: {
        type: Date,
        required: [true, 'End time is required']
    },
    duration: {
        type: Number,
        required: [true, 'Duration in minutes is required']
    },
    totalQuestions: {
        type: Number,
        required: true,
        default: 0
    },
    maximumMarks: {
        type: Number,
        required: true,
        default: 0
    },
    status: {
        type: String,
        enum: Object.values(EXAM_STATUS),
        default: EXAM_STATUS.DRAFT
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    publishedAt: Date,
    examType: {
        type: String,
        default: 'JEE'
    }
}, {
    timestamps: true
});

// Validate that endTime is after startTime
examSchema.pre('save', function(next) {
    if (this.startTime && this.endTime && this.startTime >= this.endTime) {
        next(new Error('End time must be after start time'));
    }
    next();
});

const Exam = mongoose.model('Exam', examSchema);
module.exports = Exam;
