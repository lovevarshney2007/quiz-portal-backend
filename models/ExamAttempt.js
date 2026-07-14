const mongoose = require('mongoose');

const examAttemptSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    examId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
        required: true,
        index: true
    },
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: Date,
    status: {
        type: String,
        enum: ['InProgress', 'Submitted', 'Expired', 'AutoSubmitted'],
        default: 'InProgress'
    },
    timeSpent: {
        type: Number,
        default: 0 // In seconds
    },
    tabSwitchCount: {
        type: Number,
        default: 0
    },
    fullscreenExits: {
        type: Number,
        default: 0
    },
    questionMapping: [{
        questionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Question'
        },
        order: Number,
        optionsOrder: [Number]
    }]
}, {
    timestamps: true
});

// Prevent multiple attempts for the same exam by the same user
examAttemptSchema.index({ userId: 1, examId: 1 }, { unique: true });

const ExamAttempt = mongoose.model('ExamAttempt', examAttemptSchema);
module.exports = ExamAttempt;
