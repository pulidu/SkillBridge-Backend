"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = exports.toUserResponse = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const mongoose_1 = require("mongoose");
const constants_1 = require("../constants");
const refreshTokenSchema = new mongoose_1.Schema({
    token: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
}, { _id: false });
const userSchema = new mongoose_1.Schema({
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
        minlength: [2, 'Full name must be at least 2 characters'],
        maxlength: [80, 'Full name must be at most 80 characters'],
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address'],
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters'],
        // Never returned unless explicitly selected.
        select: false,
    },
    roles: {
        type: [{ type: String, enum: constants_1.ROLES }],
        default: ['student'],
        validate: {
            validator: (value) => Array.isArray(value) && value.length > 0,
            message: 'A user must have at least one role',
        },
    },
    avatarUrl: { type: String, trim: true },
    bio: { type: String, trim: true, maxlength: [500, 'Bio must be at most 500 characters'] },
    status: { type: String, enum: constants_1.USER_STATUSES, default: 'active', index: true },
    lastLoginAt: { type: Date },
    refreshTokens: { type: [refreshTokenSchema], default: [], select: false },
    passwordChangedAt: { type: Date, default: Date.now, select: false },
    isDeleted: { type: Boolean, default: false },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform(_doc, ret) {
            ret.id = String(ret._id);
            delete ret._id;
            delete ret.__v;
            delete ret.password;
            delete ret.refreshTokens;
            delete ret.passwordChangedAt;
            return ret;
        },
    },
    toObject: { virtuals: true },
});
userSchema.index({ roles: 1 });
userSchema.virtual('primaryRole').get(function () {
    if (!this.roles || !Array.isArray(this.roles))
        return 'student';
    const priority = ['admin', 'instructor', 'student'];
    return priority.find((role) => this.roles.includes(role)) ?? 'student';
});
userSchema.virtual('initials').get(function () {
    if (!this.fullName)
        return 'U';
    return this.fullName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');
});
userSchema.methods.comparePassword = async function (candidate) {
    if (!this.password)
        return false;
    return bcryptjs_1.default.compare(candidate, this.password);
};
/** Fields that are safe to expose to any client. */
const toUserResponse = (user) => {
    const roles = user.roles || ['student'];
    const priority = ['admin', 'instructor', 'student'];
    const primaryRole = priority.find((role) => roles.includes(role)) ?? 'student';
    const initials = user.fullName
        ? user.fullName
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() ?? '')
            .join('')
        : 'U';
    return {
        id: String(user._id),
        fullName: user.fullName,
        email: user.email,
        roles: user.roles,
        primaryRole,
        initials,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
    };
};
exports.toUserResponse = toUserResponse;
exports.User = (0, mongoose_1.model)('User', userSchema);
//# sourceMappingURL=user.model.js.map