import type { Request } from 'express';
import { AuditLog } from '../models';
import type { Role } from '../constants';
import { logger } from '../config/logger';

export interface RecordAuditInput {
  req?: Request;
  actorId?: string;
  actorRole?: Role;
  action: string;
  entity: string;
  entityId?: string;
  meta?: Record<string, unknown>;
}

/**
 * Appends an audit trail entry. Never throws: an audit failure must not break
 * the request that triggered it, so problems are logged instead.
 */
export const recordAudit = async (input: RecordAuditInput): Promise<void> => {
  try {
    await AuditLog.create({
      actor: input.actorId,
      actorRole: input.actorRole,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      meta: input.meta,
      ip: input.req?.ip,
      userAgent: input.req?.get('user-agent'),
    });
  } catch (error) {
    logger.error({ err: error, action: input.action }, 'Failed to write audit log');
  }
};
