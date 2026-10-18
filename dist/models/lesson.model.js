"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Lesson = void 0;
const mongoose_1 = require("mongoose");
const constants_1 = require("../constants");
const slug_1 = require("../utils/slug");
const attachmentSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    size: { type: Number, default: 0, min: 0 },
    mimeType: { type: String, trim: true },
}, { _id: false });
const lessonSchema = new mongoose_1.Schema({
    course: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Course',
        required: [true, 'Course is required'],
        index: true,
    },
    module: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Module', index: true },
    title: {
        type: String,
        required: [true, 'Lesson title is required'],
        trim: true,
        maxlength: [160, 'Title must be at most 160 characters'],
    },
    slug: { type: String, required: true, lowercase: true, trim: true },
    content: { type: String, default: '' },
    videoUrl: { type: String, trim: true },
    attachments: { type: [attachmentSchema], default: [] },
    type: { type: String, enum: constants_1.LESSON_TYPES, default: 'article' },
    position: { type: Number, default: 0, min: 0 },
    durationMinutes: { type: Number, default: 0, min: 0 },
    isPreview: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: false, index: true },
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
lessonSchema.index({ course: 1, position: 1 });
lessonSchema.index({ course: 1, slug: 1 }, { unique: true });
lessonSchema.pre('validate', function (next) {
    if (this.title && !this.slug) {
        this.slug = (0, slug_1.slugify)(this.title);
    }
    next();
});
exports.Lesson = (0, mongoose_1.model)('Lesson', lessonSchema);
//# sourceMappingURL=lesson.model.js.map