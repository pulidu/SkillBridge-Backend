import type { CorsOptions } from 'cors';
import { env } from './env';

/**
 * CORS configuration driven by the CORS_ORIGINS allow-list.
 * Credentials are enabled so the httpOnly refresh cookie is sent.
 */
export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // Same-origin, curl and server-to-server requests have no Origin header.
    if (!origin) return callback(null, true);

    if (
      env.corsOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    ) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86_400,
  optionsSuccessStatus: 204,
};
