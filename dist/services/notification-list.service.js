"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteNotification = exports.markAllAsRead = exports.markAsRead = exports.unreadNotificationCount = exports.listNotifications = void 0;
const models_1 = require("../models");
const ApiError_1 = require("../utils/ApiError");
const pagination_1 = require("../utils/pagination");
const listNotifications = async (user, query) => {
    const { page, limit, skip } = (0, pagination_1.parsePagination)(query);
    const filter = { user: user.id };
    if (query.unread !== undefined)
        filter.isRead = !query.unread;
    if (query.type)
        filter.type = query.type;
    const [items, total, unreadCount] = await Promise.all([
        models_1.Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        models_1.Notification.countDocuments(filter),
        models_1.Notification.countDocuments({ user: user.id, isRead: false }),
    ]);
    return {
        items,
        meta: { ...(0, pagination_1.buildPaginationMeta)(total, page, limit), ...{ unreadCount } },
    };
};
exports.listNotifications = listNotifications;
const unreadNotificationCount = async (user) => models_1.Notification.countDocuments({ user: user.id, isRead: false });
exports.unreadNotificationCount = unreadNotificationCount;
const markAsRead = async (id, user) => {
    const notification = await models_1.Notification.findOneAndUpdate({ _id: id, user: user.id }, { $set: { isRead: true, readAt: new Date() } }, { new: true });
    if (!notification)
        throw ApiError_1.ApiError.notFound('Notification not found');
    return notification;
};
exports.markAsRead = markAsRead;
const markAllAsRead = async (user) => {
    const result = await models_1.Notification.updateMany({ user: user.id, isRead: false }, { $set: { isRead: true, readAt: new Date() } });
    return result.modifiedCount ?? 0;
};
exports.markAllAsRead = markAllAsRead;
const deleteNotification = async (id, user) => {
    const result = await models_1.Notification.deleteOne({ _id: id, user: user.id });
    if (result.deletedCount === 0)
        throw ApiError_1.ApiError.notFound('Notification not found');
};
exports.deleteNotification = deleteNotification;
//# sourceMappingURL=notification-list.service.js.map