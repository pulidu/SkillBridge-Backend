import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';
import { NOTIFICATION_TYPES, type NotificationType } from '../constants';

export interface INotification {
  user: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationDocument = HydratedDocument<INotification>;
export type NotificationModel = Model<INotification>;

const notificationSchema = new Schema<INotification, NotificationModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    },
    type: { type: String, enum: NOTIFICATION_TYPES, default: 'system', index: true },
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 160 },
    message: { type: String, required: [true, 'Message is required'], trim: true, maxlength: 1000 },
    link: { type: String, trim: true },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
  },
  { timestamps: true },
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

export const Notification = model<INotification, NotificationModel>('Notification', notificationSchema);
