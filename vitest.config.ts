import { defineConfig } from 'vitest/config';

/**
 * Two kinds of test run together:
 *
 *  - Unit tests exercise pure logic (slug, pagination, grading, validators) and
 *    need no MongoDB at all.
 *  - Auth integration tests in `src/__tests__/auth.integration.test.ts` drive
 *    the real Express app against a real MongoDB.
 *
 * The env values below satisfy `config/env.ts` validation without touching a
 * real `.env` file; they are throwaway test-only values. `MONGODB_DB_NAME` is
 * deliberately NOT set here: the integration suite points mongoose at its own
 * throwaway database and refuses to run against `skillbridge_lms`, so a stray
 * `npm test` can never wipe development data.
 *
 * `BCRYPT_SALT_ROUNDS=4` and a high auth rate limit keep the suite fast: the
 * production cost factor of 12 would add seconds per password operation, and
 * the default limit of 20 attempts would throttle the tests themselves.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Integration tests share one MongoDB and must not race each other.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-only-access-secret-value-not-used-anywhere-else',
      JWT_REFRESH_SECRET: 'test-only-refresh-secret-value-not-used-anywhere-else',
      LOG_LEVEL: 'silent',
      BCRYPT_SALT_ROUNDS: '4',
      AUTH_RATE_LIMIT_MAX: '10000',
      RATE_LIMIT_MAX: '10000',
    },
  },
});
