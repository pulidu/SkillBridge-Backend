import { Notification } from '../models';
import type { AuthUser, PaginatedResult } from '../types';
import { ApiError } from '../utils/ApiError';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import type { ListNotificationsInput } from '../validators/enrollment.validator';

export const listNotifications = async (
  user: AuthUser,
  query: ListNotificationsInput,
): Promise<PaginatedResult<unknown>> => {
  const { page, limit, skip } = parsePagination(query);

  const filter: Record<string, unknown> = { user: user.id };
  if (query.unread !== undefined) filter.isRead = !query.unread;
  if (query.type) filter.type = query.type;

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: user.id, isRead: false }),
  ]);

  return {
    items,
    meta: { ...buildPaginationMeta(total, page, limit), ...({ unreadCount } as object) },
  };
};

export const unreadNotificationCount = async (user: AuthUser): Promise<number> =>
  Notification.countDocuments({ user: user.id, isRead: false });

export const markAsRead = async (id: string, user: AuthUser): Promise<unknown> => {
  const notification = await Notification.findOneAndUpdate(
    { _id: id, user: user.id },
    { $set: { isRead: true, readAt: new Date() } },
    { new: true },
  );

  if (!notification) throw ApiError.notFound('Notification not found');
  return notification;
};

export const markAllAsRead = async (user: AuthUser): Promise<number> => {
  const result = await Notification.updateMany(
    { user: user.id, isRead: false },
    { $set: { isRead: true, readAt: new Date() } },
  );

  return result.modifiedCount ?? 0;
};

export const deleteNotification = async (id: string, user: AuthUser): Promise<void> => {
  const result = await Notification.deleteOne({ _id: id, user: user.id });
  if (result.deletedCount === 0) throw ApiError.notFound('Notification not found');
};
