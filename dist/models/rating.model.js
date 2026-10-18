"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rating = void 0;
const mongoose_1 = require("mongoose");
const ratingSchema = new mongoose_1.Schema({
    course: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Course',
        required: [true, 'Course is required'],
        index: true,
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User is required'],
        index: true,
    },
    value: {
        type: Number,
        required: [true, 'Rating value is required'],
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating must be at most 5'],
    },
    review: { type: String, trim: true, maxlength: [1000, 'Review is too long'] },
}, { timestamps: true });
// One rating per user per course; re-rating updates the existing document.
ratingSchema.index({ course: 1, user: 1 }, { unique: true });
exports.Rating = (0, mongoose_1.model)('Rating', ratingSchema);
//# sourceMappingURL=rating.model.js.map