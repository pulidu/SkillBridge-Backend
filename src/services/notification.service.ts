import type { Types } from 'mongoose';
import type { NotificationType } from '../constants';
import { Notification } from '../models';

export interface CreateNotificationInput {
  user: string | Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

/** Creates one in-app notification. Callers fire this without awaiting. */
export const createNotification = async (input: CreateNotificationInput): Promise<void> => {
  await Notification.create({
    user: input.user,
    type: input.type,
    title: input.title,
    message: input.message,
    link: input.link,
  });
};

/** Best-effort broadcast used after a course is published. */
export const notifyEnrolledStudents = async (
  courseId: string | Types.ObjectId,
  payload: { type: NotificationType; title: string; message: string; link: string },
): Promise<void> => {
  const { Enrollment } = await import('../models');
  const enrollments = await Enrollment.find({ course: courseId, status: 'active' })
    .select('student')
    .lean();

  if (enrollments.length === 0) return;

  await Notification.insertMany(
    enrollments.map((enrollment) => ({ user: enrollment.student, ...payload })),
  );
};
