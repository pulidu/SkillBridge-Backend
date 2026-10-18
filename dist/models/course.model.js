"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Course = exports.COURSE_LIST_FIELDS = void 0;
const mongoose_1 = require("mongoose");
const constants_1 = require("../constants");
const courseSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: [true, 'Course title is required'],
        trim: true,
        minlength: [5, 'Title must be at least 5 characters'],
        maxlength: [120, 'Title must be at most 120 characters'],
    },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: {
        type: String,
        required: [true, 'Course description is required'],
        trim: true,
        minlength: [20, 'Description must be at least 20 characters'],
        maxlength: [2000, 'Description must be at most 2000 characters'],
    },
    shortDescription: {
        type: String,
        trim: true,
        maxlength: [200, 'Short description must be at most 200 characters'],
    },
    thumbnailUrl: { type: String, trim: true },
    category: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Category is required'],
        index: true,
    },
    instructor: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Instructor is required'],
        index: true,
    },
    level: { type: String, enum: constants_1.COURSE_LEVELS, default: 'beginner', index: true },
    status: { type: String, enum: constants_1.COURSE_STATUSES, default: 'draft', index: true },
    price: { type: Number, default: 0, min: [0, 'Price cannot be negative'] },
    currency: { type: String, default: 'USD', uppercase: true, trim: true },
    tags: { type: [String], default: [] },
    outcomes: { type: [String], default: [] },
    requirements: { type: [String], default: [] },
    durationMinutes: { type: Number, default: 0, min: 0 },
    totalLessons: { type: Number, default: 0, min: 0 },
    enrollmentCount: { type: Number, default: 0, min: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    publishedAt: { type: Date },
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
courseSchema.index({ status: 1, category: 1 });
courseSchema.index({ title: 'text', description: 'text' });
/** Fields projected in list responses to keep payloads small. */
exports.COURSE_LIST_FIELDS = 'title slug shortDescription thumbnailUrl category instructor level status price currency tags averageRating ratingCount totalLessons durationMinutes enrollmentCount publishedAt createdAt';
exports.Course = (0, mongoose_1.model)('Course', courseSchema);
//# sourceMappingURL=course.model.js.map