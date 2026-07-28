const mongoose = require('mongoose');

const violationSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    exam: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
        required: true,
        index: true
    },
    attempt: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ExamAttempt',
        required: true
    },
    type: {
        type: String,
        enum: ['TabSwitch', 'FullscreenExit', 'CopyPaste', 'MultipleFaces', 'NoFace', 'Other'],
        required: true
    },
    ip: String,
    browser: String,
    device: String,
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Optimize violation aggregation and admin dashboard queries
violationSchema.index({ exam: 1, createdAt: -1 });
violationSchema.index({ student: 1, exam: 1 });

const Violation = mongoose.model('Violation', violationSchema);
module.exports = Violation;
