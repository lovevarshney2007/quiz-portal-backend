const mongoose = require('mongoose');

const questionStatusSchema = new mongoose.Schema({
    attemptId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ExamAttempt',
        required: true,
        index: true
    },
    questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
        required: true
    },
    status: {
        type: String,
        enum: ['NotVisited', 'Visited', 'Answered', 'MarkedForReview', 'AnsweredMarkedForReview', 'Skipped'],
        default: 'NotVisited'
    },
    givenAnswer: [{
        type: String // Option ID(s) or exact text
    }],
    timeSpent: {
        type: Number,
        default: 0 // In seconds
    },
    visitedCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

questionStatusSchema.index({ attemptId: 1, questionId: 1 }, { unique: true });

const QuestionStatus = mongoose.model('QuestionStatus', questionStatusSchema);
module.exports = QuestionStatus;
