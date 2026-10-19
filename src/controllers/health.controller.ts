import type { Request, Response } from 'express';
import { env, envConfigErrors } from '../config/env';
import { databaseHealth } from '../config/database';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const health = asyncHandler(async (_req: Request, res: Response) =>
  sendSuccess(res, {
    status: envConfigErrors.length > 0 ? 'warning' : 'ok',
    service: 'skillbridge-lms-api',
    environment: env.nodeEnv,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    ...(envConfigErrors.length > 0 ? { configWarnings: envConfigErrors } : {}),
  }),
);

export const healthWithDatabase = asyncHandler(async (_req: Request, res: Response) => {
  const database = await databaseHealth();

  return sendSuccess(
    res,
    {
      status: database.connected ? 'ok' : 'degraded',
      database,
      timestamp: new Date().toISOString(),
    },
    database.connected ? 200 : 503,
  );
});
