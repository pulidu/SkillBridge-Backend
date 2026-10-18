"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Enrollment = exports.calculateProgress = void 0;
const mongoose_1 = require("mongoose");
const constants_1 = require("../constants");
const enrollmentSchema = new mongoose_1.Schema({
    course: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Course',
        required: [true, 'Course is required'],
        index: true,
    },
    student: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Student is required'],
        index: true,
    },
    status: { type: String, enum: constants_1.ENROLLMENT_STATUSES, default: 'active', index: true },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    completedLessons: { type: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Lesson' }], default: [] },
    timeSpentMinutes: { type: Number, default: 0, min: 0 },
    lastAccessedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    finalScore: { type: Number, min: 0, max: 100 },
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
// One enrolment per student per course.
enrollmentSchema.index({ course: 1, student: 1 }, { unique: true });
enrollmentSchema.index({ student: 1, status: 1 });
/**
 * Progress is derived, never trusted from the client: it is always a rounded
 * percentage of completed published lessons.
 */
const calculateProgress = (completed, total) => {
    if (total <= 0)
        return 0;
    const percent = (completed / total) * 100;
    return Math.min(100, Math.max(0, Math.round(percent)));
};
exports.calculateProgress = calculateProgress;
exports.Enrollment = (0, mongoose_1.model)('Enrollment', enrollmentSchema);
//# sourceMappingURL=enrollment.model.js.map