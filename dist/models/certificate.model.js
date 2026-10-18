"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Certificate = exports.buildSerialNumber = void 0;
const mongoose_1 = require("mongoose");
const certificateSchema = new mongoose_1.Schema({
    serialNumber: {
        type: String,
        required: [true, 'Serial number is required'],
        unique: true,
        uppercase: true,
        trim: true,
    }, course: {
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
    enrollment: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Enrollment', required: true },
    finalScore: { type: Number, min: 0, max: 100 },
    issuedAt: { type: Date, default: Date.now },
    revokedAt: { type: Date },
    revokedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
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
// `serialNumber` is declared unique inline; only the compound lookup needs an
// explicit index.
certificateSchema.index({ student: 1, course: 1 }, { unique: true });
/** Builds a human-verifiable serial such as `SB-2026-0001A2B`. */
const buildSerialNumber = (sequence, salt) => `SB-${new Date().getFullYear()}-${String(sequence).padStart(6, '0')}${salt.toUpperCase()}`;
exports.buildSerialNumber = buildSerialNumber;
exports.Certificate = (0, mongoose_1.model)('Certificate', certificateSchema);
//# sourceMappingURL=certificate.model.js.map