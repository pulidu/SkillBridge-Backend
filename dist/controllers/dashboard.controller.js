"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteNotification = exports.markAllAsRead = exports.markAsRead = exports.unreadCount = exports.listNotifications = exports.listAuditLogs = exports.adminDashboard = exports.instructorDashboard = exports.studentDashboard = void 0;
const dashboardService = __importStar(require("../services/dashboard.service"));
const notificationService = __importStar(require("../services/notification-list.service"));
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const currentUser = (req) => req.user;
exports.studentDashboard = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const dashboard = await dashboardService.getStudentDashboard(currentUser(req));
    return (0, response_1.sendSuccess)(res, dashboard);
});
exports.instructorDashboard = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const dashboard = await dashboardService.getInstructorDashboard(currentUser(req));
    return (0, response_1.sendSuccess)(res, dashboard);
});
exports.adminDashboard = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const dashboard = await dashboardService.getAdminDashboard(currentUser(req));
    return (0, response_1.sendSuccess)(res, dashboard);
});
exports.listAuditLogs = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const query = req.query;
    const result = await dashboardService.listAuditLogs({
        page: Number(query.page) || undefined,
        limit: Number(query.limit) || undefined,
        actor: query.actor,
        entity: query.entity,
        action: query.action,
    });
    return (0, response_1.sendSuccess)(res, result.items, 200, result.meta);
});
/* ------------------------------ notifications ------------------------------ */
exports.listNotifications = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const result = await notificationService.listNotifications(currentUser(req), req.query);
    return (0, response_1.sendSuccess)(res, result.items, 200, result.meta);
});
exports.unreadCount = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const count = await notificationService.unreadNotificationCount(currentUser(req));
    return (0, response_1.sendSuccess)(res, { count });
});
exports.markAsRead = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const notification = await notificationService.markAsRead(req.params.id, currentUser(req));
    return (0, response_1.sendSuccess)(res, notification);
});
exports.markAllAsRead = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const updated = await notificationService.markAllAsRead(currentUser(req));
    return (0, response_1.sendSuccess)(res, { updated });
});
exports.deleteNotification = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await notificationService.deleteNotification(req.params.id, currentUser(req));
    return (0, response_1.sendNoContent)(res);
});
//# sourceMappingURL=dashboard.controller.js.map