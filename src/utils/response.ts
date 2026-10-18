import type { Response } from 'express';
import type { PaginationMeta } from '../types';

/**
 * Builds the single success envelope used by every endpoint.
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: PaginationMeta,
): Response => {
  const body: Record<string, unknown> = { success: true, data };

  if (meta) body.meta = meta;

  return res.status(statusCode).json(body);
};

export const sendCreated = <T>(res: Response, data: T): Response =>
  sendSuccess(res, data, 201);

export const sendNoContent = (res: Response): Response => res.status(204).send();
