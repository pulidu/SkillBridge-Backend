import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';
import { ROLES, type Role } from '../constants';

export interface IAuditLog {
  actor?: Types.ObjectId;
  actorRole?: Role;
  action: string;
  entity: string;
  entityId?: Types.ObjectId;
  meta?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type AuditLogDocument = HydratedDocument<IAuditLog>;
export type AuditLogModel = Model<IAuditLog>;

const auditLogSchema = new Schema<IAuditLog, AuditLogModel>(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    actorRole: { type: String, enum: ROLES },
    action: { type: String, required: [true, 'Action is required'], trim: true, index: true },
    entity: { type: String, required: [true, 'Entity is required'], trim: true, index: true },
    entityId: { type: Schema.Types.ObjectId, index: true },
    meta: { type: Schema.Types.Mixed },
    ip: { type: String, trim: true },
    userAgent: { type: String, trim: true },
  },
  { timestamps: true },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entity: 1, entityId: 1 });

export const AuditLog = model<IAuditLog, AuditLogModel>('AuditLog', auditLogSchema);
