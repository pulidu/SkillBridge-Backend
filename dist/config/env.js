"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const node_path_1 = __importDefault(require("node:path"));
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
/**
 * Centralised, validated access to process.env.
 *
 * A single Zod schema validates the environment once at import time, so the
 * process either starts with a fully valid configuration or exits with a
 * readable message. Nothing else in the codebase reads `process.env` directly.
 */
dotenv_1.default.config({ path: node_path_1.default.resolve(process.cwd(), '.env') });
const DEV_PLACEHOLDER = /^dev-only-/;
const booleanFromEnv = zod_1.z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true');
const intFromEnv = (fallback) => zod_1.z
    .string()
    .optional()
    .transform((value) => (value === undefined || value === '' ? fallback : Number(value)))
    .pipe(zod_1.z.number().int().positive());
const envSchema = zod_1.z
    .object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: intFromEnv(5000),
    HOST: zod_1.z.string().default('localhost'),
    LOG_LEVEL: zod_1.z
        .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'])
        .default('info'),
    LOG_PRETTY: booleanFromEnv,
    MONGODB_URI: zod_1.z.string().optional().default(''),
    MONGODB_HOST: zod_1.z.string().default('127.0.0.1'),
    MONGODB_PORT: intFromEnv(27017),
    MONGODB_DB_NAME: zod_1.z.string().default('skillbridge_lms'),
    MONGODB_USER: zod_1.z.string().optional().default(''),
    MONGODB_PASSWORD: zod_1.z.string().optional().default(''),
    MONGODB_AUTH_SOURCE: zod_1.z.string().default('admin'),
    JWT_SECRET: zod_1.z
        .string()
        .min(32, 'JWT_SECRET must be at least 32 characters long'),
    JWT_REFRESH_SECRET: zod_1.z
        .string()
        .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters long'),
    JWT_EXPIRES_IN: zod_1.z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: zod_1.z.string().default('7d'),
    BCRYPT_SALT_ROUNDS: intFromEnv(12),
    CORS_ORIGINS: zod_1.z.string().default('http://localhost:5173,http://127.0.0.1:5173'),
    COOKIE_SECURE: booleanFromEnv,
    COOKIE_DOMAIN: zod_1.z.string().optional().default(''),
    CLIENT_URL: zod_1.z.string().default('http://localhost:5173'),
    RATE_LIMIT_WINDOW_MS: intFromEnv(15 * 60 * 1000),
    RATE_LIMIT_MAX: intFromEnv(100),
    AUTH_RATE_LIMIT_MAX: intFromEnv(20),
    SEED_PASSWORD: zod_1.z.string().default('SkillBridge#2024'),
    // Bootstrap credentials for `npm run create-admin`. Optional so that a
    // normal deployment never carries them; validated in the script itself so a
    // missing value is a readable error instead of a confusing failure.
    ADMIN_EMAIL: zod_1.z.string().optional().default(''),
    ADMIN_PASSWORD: zod_1.z.string().optional().default(''),
    ADMIN_FULL_NAME: zod_1.z.string().optional().default(''),
})
    .superRefine((value, ctx) => {
    if (value.NODE_ENV !== 'production')
        return;
    for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET']) {
        if (DEV_PLACEHOLDER.test(value[key])) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: [key],
                message: `${key} still uses the development placeholder in production.`,
            });
        }
    }
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    const details = parsed.error.issues
        .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('\n');
    // eslint-disable-next-line no-console
    console.error(`\nInvalid environment configuration:\n${details}\n\nCopy .env.example to .env and fix the values above.\n`);
    process.exit(1);
}
const raw = parsed.data;
const buildMongoUri = () => {
    if (raw.MONGODB_URI)
        return raw.MONGODB_URI;
    const credentials = raw.MONGODB_USER && raw.MONGODB_PASSWORD
        ? `${encodeURIComponent(raw.MONGODB_USER)}:${encodeURIComponent(raw.MONGODB_PASSWORD)}@`
        : '';
    return `mongodb://${credentials}${raw.MONGODB_HOST}:${raw.MONGODB_PORT}/${raw.MONGODB_DB_NAME}?authSource=${raw.MONGODB_AUTH_SOURCE}`;
};
exports.env = {
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
};
//# sourceMappingURL=env.js.map