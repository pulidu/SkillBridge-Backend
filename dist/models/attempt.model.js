"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Attempt = void 0;
const mongoose_1 = require("mongoose");
const attemptAnswerSchema = new mongoose_1.Schema({
    question: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Quiz.questions', required: true },
    selectedOptionIds: { type: [{ type: mongoose_1.Schema.Types.ObjectId }], default: [] },
    textAnswer: { type: String, trim: true },
    isCorrect: { type: Boolean, default: false },
    pointsAwarded: { type: Number, default: 0, min: 0 },
}, { _id: false });
const attemptSchema = new mongoose_1.Schema({
    quiz: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Quiz',
        required: [true, 'Quiz is required'],
        index: true,
    },
    // Denormalised so roster analytics need no aggregation across quizzes.
    course: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    student: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Student is required'],
        index: true,
    },
    enrollment: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Enrollment' },
    answers: { type: [attemptAnswerSchema], default: [] },
    score: { type: Number, default: 0, min: 0 },
    maxScore: { type: Number, default: 0, min: 0 },
    percentage: { type: Number, default: 0, min: 0, max: 100 },
    passed: { type: Boolean, default: false },
    attemptNumber: { type: Number, default: 1, min: 1 },
    timeSpentSeconds: { type: Number, default: 0, min: 0 },
    submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });
attemptSchema.index({ quiz: 1, student: 1, attemptNumber: 1 });
attemptSchema.index({ student: 1, createdAt: -1 });
exports.Attempt = (0, mongoose_1.model)('Attempt', attemptSchema);
//# sourceMappingURL=attempt.model.js.map