"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourseModule = exports.moduleSlug = void 0;
const mongoose_1 = require("mongoose");
const slug_1 = require("../utils/slug");
const moduleSchema = new mongoose_1.Schema({
    course: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Course',
        required: [true, 'Course is required'],
        index: true,
    },
    title: {
        type: String,
        required: [true, 'Module title is required'],
        trim: true,
        maxlength: [120, 'Title must be at most 120 characters'],
    },
    description: { type: String, trim: true, maxlength: [1000, 'Description is too long'] },
    position: { type: Number, default: 0, min: 0 },
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
moduleSchema.index({ course: 1, position: 1 });
moduleSchema.pre('validate', function (next) {
    if (!this.title)
        next();
    else {
        this.title = this.title.trim();
        next();
    }
});
/** Convenience export so titles can be slugged consistently. */
exports.moduleSlug = slug_1.slugify;
exports.CourseModule = (0, mongoose_1.model)('Module', moduleSchema);
//# sourceMappingURL=module.model.js.map