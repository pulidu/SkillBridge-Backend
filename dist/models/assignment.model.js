"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Assignment = exports.gradePercentage = exports.isOverdue = void 0;
const mongoose_1 = require("mongoose");
const assignmentSchema = new mongoose_1.Schema({
    course: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Course',
        required: [true, 'Course is required'],
        index: true,
    },
    lesson: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Lesson', index: true },
    title: {
        type: String,
        required: [true, 'Assignment title is required'],
        trim: true,
        minlength: [3, 'Title must be at least 3 characters'],
        maxlength: [160, 'Title must be at most 160 characters'],
    },
    instructions: {
        type: String,
        required: [true, 'Instructions are required'],
        trim: true,
        minlength: [10, 'Instructions must be at least 10 characters'],
        maxlength: [5000, 'Instructions must be at most 5000 characters'],
    },
    dueDate: { type: Date },
    maxMarks: {
        type: Number,
        required: [true, 'Max marks are required'],
        min: [1, 'Max marks must be at least 1'],
        max: [1000, 'Max marks must be at most 1000'],
        default: 100,
    },
    isPublished: { type: Boolean, default: false, index: true },
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
/* ---------------------------------- indexes -------------------------------- */
// Learners browse the published tasks of a course; owners list all of them.
assignmentSchema.index({ course: 1, isPublished: 1 });
assignmentSchema.index({ course: 1, createdAt: -1 });
// `lesson` and `dueDate` are optional, so a partial index skips documents that
// omit them and stays small.
assignmentSchema.index({ dueDate: 1 }, { partialFilterExpression: { dueDate: { $exists: true } } });
assignmentSchema.index({ title: 'text', instructions: 'text' });
/**
 * Duplicate-suppression for student work lives on `Submission` (one submission
 * per assignment per student). Nothing is enforced here beyond the field rules
 * above, so instructors are free to run two tasks with similar titles.
 */
/** Deadline checks, kept pure so they can be unit tested without a database. */
const isOverdue = (dueDate, now = new Date()) => {
    if (!dueDate)
        return false;
    return dueDate.getTime() < now.getTime();
};
exports.isOverdue = isOverdue;
/** Percentage of the available marks, clamped to 0-100. */
const gradePercentage = (grade, maxMarks) => {
    if (maxMarks <= 0)
        return 0;
    const percent = (grade / maxMarks) * 100;
    return Math.min(100, Math.max(0, Math.round(percent)));
};
exports.gradePercentage = gradePercentage;
exports.Assignment = (0, mongoose_1.model)('Assignment', assignmentSchema);
//# sourceMappingURL=assignment.model.js.map