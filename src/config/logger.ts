import pino from 'pino';
import { env } from './env';

/**
 * Application logger. Secrets are redacted so they can never reach a log sink.
 */
export const logger = pino({
  level: env.logLevel,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'password',
      '*.password',
      'token',
      '*.token',
      'refreshToken',
      '*.refreshToken',
    ],
    censor: '[redacted]',
  },
  ...(env.logPretty && !env.isProduction
    ? {
        transport: {
          target: 'pino/file',
          options: { destination: 1 },
        },
      }
    : {}),
});

export const loggerConfig = {
  logger,
  autoLogging: {
    ignore: (req: { url?: string }) => Boolean(req.url?.startsWith('/api/v1/health')),
  },
};
