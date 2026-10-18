"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Quiz = exports.sanitiseQuizForStudent = void 0;
const mongoose_1 = require("mongoose");
const constants_1 = require("../constants");
const questionSchema = new mongoose_1.Schema({
    text: { type: String, required: [true, 'Question text is required'], trim: true },
    type: { type: String, enum: constants_1.QUESTION_TYPES, default: 'single' },
    options: {
        type: [
            new mongoose_1.Schema({
                text: { type: String, required: true, trim: true },
                isCorrect: { type: Boolean, default: false },
            }, { _id: true }),
        ],
        default: [],
    },
    correctAnswer: { type: String, trim: true },
    points: { type: Number, default: 1, min: 0 },
    explanation: { type: String, trim: true, maxlength: [1000, 'Explanation is too long'] },
}, { _id: true });
const quizSchema = new mongoose_1.Schema({
    course: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Course',
        required: [true, 'Course is required'],
        index: true,
    },
    lesson: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Lesson' },
    title: {
        type: String,
        required: [true, 'Quiz title is required'],
        trim: true,
        maxlength: [160, 'Title must be at most 160 characters'],
    },
    description: { type: String, trim: true, maxlength: [1000, 'Description is too long'] },
    questions: { type: [questionSchema], default: [] },
    passingScore: { type: Number, default: 70, min: 0, max: 100 },
    timeLimitMinutes: { type: Number, min: 1 },
    maxAttempts: { type: Number, default: 3, min: 1 },
    shuffleQuestions: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform(_doc, ret) {
            ret.id = String(ret._id);
            delete ret._id;
            delete ret.__v;
            return ret;
        },
    },
});
/**
 * Strips the answer key before a quiz is sent to a student, so correct options
 * can never be read out of a network payload.
 */
const sanitiseQuizForStudent = (quiz) => ({
    ...quiz,
    questions: quiz.questions.map((question) => ({
        _id: question._id,
        text: question.text,
        type: question.type,
        points: question.points,
        explanation: question.explanation,
        options: question.options.map((option) => ({
            _id: option._id,
            text: option.text,
        })),
    })),
});
exports.sanitiseQuizForStudent = sanitiseQuizForStudent;
exports.Quiz = (0, mongoose_1.model)('Quiz', quizSchema);
//# sourceMappingURL=quiz.model.js.map