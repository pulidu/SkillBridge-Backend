"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Notification = void 0;
const mongoose_1 = require("mongoose");
const constants_1 = require("../constants");
const notificationSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User is required'],
        index: true,
    },
    type: { type: String, enum: constants_1.NOTIFICATION_TYPES, default: 'system', index: true },
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 160 },
    message: { type: String, required: [true, 'Message is required'], trim: true, maxlength: 1000 },
    link: { type: String, trim: true },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
}, { timestamps: true });
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
exports.Notification = (0, mongoose_1.model)('Notification', notificationSchema);
//# sourceMappingURL=notification.model.js.map