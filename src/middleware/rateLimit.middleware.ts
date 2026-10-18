import rateLimit, { type Options } from 'express-rate-limit';
import { env } from '../config/env';

const handler = (message: string) => (_req: unknown, res: { status: (code: number) => { json: (body: unknown) => unknown } }) => {
  res.status(429).json({ success: false, message });
};

const shared: Partial<Options> = {
  standardHeaders: true,
  legacyHeaders: false,
};

/** Broad limiter applied to the whole API surface. */
export const apiLimiter = rateLimit({
  ...shared,
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  handler: handler('Too many requests, please try again later'),
});

/** Stricter limiter for credential endpoints to slow down brute force. */
export const authLimiter = rateLimit({
  ...shared,
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.authMax,
  skipSuccessfulRequests: true,
  handler: handler('Too many authentication attempts, please try again later'),
});
