import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

/**
 * Centralised, validated access to process.env.
 *
 * A single Zod schema validates the environment once at import time, so the
 * process either starts with a fully valid configuration or exits with a
 * readable message. Nothing else in the codebase reads `process.env` directly.
 */

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const DEV_PLACEHOLDER = /^dev-only-/;

const booleanFromEnv = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const intFromEnv = (fallback: number) =>
  z
    .string()
    .optional()
    .transform((value) => (value === undefined || value === '' ? fallback : Number(value)))
    .pipe(z.number().int().positive());

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: intFromEnv(5000),
    HOST: z.string().default('localhost'),
    LOG_LEVEL: z
      .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'])
      .default('info'),
    LOG_PRETTY: booleanFromEnv,

    MONGODB_URI: z.string().optional().default(''),
    MONGODB_HOST: z.string().default('127.0.0.1'),
    MONGODB_PORT: intFromEnv(27017),
    MONGODB_DB_NAME: z.string().default('skillbridge_lms'),
    MONGODB_USER: z.string().optional().default(''),
    MONGODB_PASSWORD: z.string().optional().default(''),
    MONGODB_AUTH_SOURCE: z.string().default('admin'),

    JWT_SECRET: z
      .string()
      .min(32, 'JWT_SECRET must be at least 32 characters long'),
    JWT_REFRESH_SECRET: z
      .string()
      .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters long'),
    JWT_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
    BCRYPT_SALT_ROUNDS: intFromEnv(12),

    CORS_ORIGINS: z.string().default('http://localhost:5173,http://127.0.0.1:5173'),
    COOKIE_SECURE: booleanFromEnv,
    COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    COOKIE_DOMAIN: z.string().optional().default(''),
    CLIENT_URL: z.string().default('http://localhost:5173'),

    RATE_LIMIT_WINDOW_MS: intFromEnv(15 * 60 * 1000),
    RATE_LIMIT_MAX: intFromEnv(100),
    AUTH_RATE_LIMIT_MAX: intFromEnv(20),

    SEED_PASSWORD: z.string().default('SkillBridge#2024'),

    // Bootstrap credentials for `npm run create-admin`. Optional so that a
    // normal deployment never carries them; validated in the script itself so a
    // missing value is a readable error instead of a confusing failure.
    ADMIN_EMAIL: z.string().optional().default(''),
    ADMIN_PASSWORD: z.string().optional().default(''),
    ADMIN_FULL_NAME: z.string().optional().default(''),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV !== 'production') return;

    for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET'] as const) {
      if (DEV_PLACEHOLDER.test(value[key])) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} still uses the development placeholder in production.`,
        });
      }
    }
  });

let parsed = envSchema.safeParse(process.env);
export const envConfigErrors: string[] = [];

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');

  envConfigErrors.push(...parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`));

  // eslint-disable-next-line no-console
  console.error(`\nInvalid environment configuration:\n${details}\n\nCopy .env.example to .env and fix the values above.\n`);

  // In non-serverless runtime (e.g. standalone server startup) or testing, exit if explicitly standalone,
  // but in serverless environments (e.g. Vercel), avoid crashing the entire runtime container on module load.
  if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }

  // Provide a safe fallback parsed result so the app module can finish initializing
  parsed = {
    success: true,
    data: {
      NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'production',
      PORT: 5000,
      HOST: '0.0.0.0',
      LOG_LEVEL: 'info',
      LOG_PRETTY: false,
      MONGODB_URI: process.env.MONGODB_URI || '',
      MONGODB_HOST: process.env.MONGODB_HOST || '127.0.0.1',
      MONGODB_PORT: 27017,
      MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || 'skillbridge_lms',
      MONGODB_USER: process.env.MONGODB_USER || '',
      MONGODB_PASSWORD: process.env.MONGODB_PASSWORD || '',
      MONGODB_AUTH_SOURCE: process.env.MONGODB_AUTH_SOURCE || 'admin',
      JWT_SECRET: process.env.JWT_SECRET || 'temporary-fallback-secret-for-serverless-initialization-minimum32',
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'temporary-fallback-secret-for-serverless-initialization-minimum32',
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
      JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      BCRYPT_SALT_ROUNDS: 12,
      CORS_ORIGINS: process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173',
      COOKIE_SECURE: process.env.COOKIE_SECURE === 'true',
      COOKIE_SAME_SITE: (process.env.COOKIE_SAME_SITE as 'lax' | 'strict' | 'none') || 'lax',
      COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || '',
      CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
      RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000,
      RATE_LIMIT_MAX: 100,
      AUTH_RATE_LIMIT_MAX: 20,
      SEED_PASSWORD: process.env.SEED_PASSWORD || 'SkillBridge#2024',
      ADMIN_EMAIL: process.env.ADMIN_EMAIL || '',
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '',
      ADMIN_FULL_NAME: process.env.ADMIN_FULL_NAME || '',
    },
  };
}

const raw = parsed.data;

const buildMongoUri = (): string => {
  if (raw.MONGODB_URI) return raw.MONGODB_URI;

  const credentials =
    raw.MONGODB_USER && raw.MONGODB_PASSWORD
      ? `${encodeURIComponent(raw.MONGODB_USER)}:${encodeURIComponent(raw.MONGODB_PASSWORD)}@`
      : '';

  return `mongodb://${credentials}${raw.MONGODB_HOST}:${raw.MONGODB_PORT}/${raw.MONGODB_DB_NAME}?authSource=${raw.MONGODB_AUTH_SOURCE}`;
};

export const env = {
  nodeEnv: raw.NODE_ENV,
  isProduction: raw.NODE_ENV === 'production',
  isDevelopment: raw.NODE_ENV === 'development',
  isTest: raw.NODE_ENV === 'test',
  port: raw.PORT,
  host: raw.HOST,
  logLevel: raw.LOG_LEVEL,
  logPretty: raw.LOG_PRETTY,

  mongoUri: buildMongoUri(),

  jwt: {
    accessSecret: raw.JWT_SECRET,
    refreshSecret: raw.JWT_REFRESH_SECRET,
    accessExpiresIn: raw.JWT_EXPIRES_IN,
    refreshExpiresIn: raw.JWT_REFRESH_EXPIRES_IN,
  },
  bcryptSaltRounds: raw.BCRYPT_SALT_ROUNDS,

  corsOrigins: raw.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  cookieSecure: raw.COOKIE_SECURE,
  cookieSameSite: raw.COOKIE_SAME_SITE,
  cookieDomain: raw.COOKIE_DOMAIN,
  clientUrl: raw.CLIENT_URL,

  rateLimit: {
    windowMs: raw.RATE_LIMIT_WINDOW_MS,
    max: raw.RATE_LIMIT_MAX,
    authMax: raw.AUTH_RATE_LIMIT_MAX,
  },

  seedPassword: raw.SEED_PASSWORD,

  bootstrapAdmin: {
    email: raw.ADMIN_EMAIL,
    password: raw.ADMIN_PASSWORD,
    fullName: raw.ADMIN_FULL_NAME,
  },
} as const;

export type Env = typeof env;
