"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Category = void 0;
const mongoose_1 = require("mongoose");
const slug_1 = require("../utils/slug");
const categorySchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        unique: true,
        trim: true,
        minlength: [2, 'Name must be at least 2 characters'],
        maxlength: [60, 'Name must be at most 60 characters'],
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    description: { type: String, trim: true, maxlength: [300, 'Description is too long'] },
    icon: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
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
// Derive the slug when the caller did not supply one.
categorySchema.pre('validate', function (next) {
    if (!this.slug && this.name) {
        this.slug = (0, slug_1.slugify)(this.name);
    }
    next();
});
exports.Category = (0, mongoose_1.model)('Category', categorySchema);
//# sourceMappingURL=category.model.js.map