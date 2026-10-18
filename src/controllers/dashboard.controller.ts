import type { Request, Response } from 'express';
import * as dashboardService from '../services/dashboard.service';
import * as notificationService from '../services/notification-list.service';
import type { AuthUser } from '../types';
import { asyncHandler } from '../utils/asyncHandler';
import { sendNoContent, sendSuccess } from '../utils/response';
import type { ListNotificationsInput } from '../validators/enrollment.validator';

const currentUser = (req: Request): AuthUser => req.user as AuthUser;

export const studentDashboard = asyncHandler(async (req: Request, res: Response) => {
  const dashboard = await dashboardService.getStudentDashboard(currentUser(req));
  return sendSuccess(res, dashboard);
});

export const instructorDashboard = asyncHandler(async (req: Request, res: Response) => {
  const dashboard = await dashboardService.getInstructorDashboard(currentUser(req));
  return sendSuccess(res, dashboard);
});

export const adminDashboard = asyncHandler(async (req: Request, res: Response) => {
  const dashboard = await dashboardService.getAdminDashboard(currentUser(req));
  return sendSuccess(res, dashboard);
});

export const listAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as { page?: string; limit?: string; actor?: string; entity?: string; action?: string };
  const result = await dashboardService.listAuditLogs({
    page: Number(query.page) || undefined,
    limit: Number(query.limit) || undefined,
    actor: query.actor,
    entity: query.entity,
    action: query.action,
  });
  return sendSuccess(res, result.items, 200, result.meta);
});

/* ------------------------------ notifications ------------------------------ */

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const result = await notificationService.listNotifications(
    currentUser(req),
    req.query as unknown as ListNotificationsInput,
  );
  return sendSuccess(res, result.items, 200, result.meta);
});

export const unreadCount = asyncHandler(async (req: Request, res: Response) => {
  const count = await notificationService.unreadNotificationCount(currentUser(req));
  return sendSuccess(res, { count });
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const notification = await notificationService.markAsRead(req.params.id, currentUser(req));
  return sendSuccess(res, notification);
});

export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  const updated = await notificationService.markAllAsRead(currentUser(req));
  return sendSuccess(res, { updated });
});

export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  await notificationService.deleteNotification(req.params.id, currentUser(req));
  return sendNoContent(res);
});
