/**
 * End-to-end authentication tests.
 *
 * These drive the real Express app (`createApp()`) over HTTP with supertest
 * against a real MongoDB, so they cover routing, middleware, validation, the
 * Mongoose models and the JWT layer together rather than mocking them away.
 *
 * The suite uses a throwaway database and refuses to run against the
 * development database name, so `npm test` can never drop real data.
 */
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { env } from '../config/env';
import { REFRESH_TOKEN } from '../constants';
import { User } from '../models';
import { hashPassword } from '../services/auth.service';

const TEST_DB = 'skillbridge_lms_auth_test';
const PASSWORD = 'Secret123';

const app = createApp();

/** Signs a token that expired an hour ago, using the real secret. */
const expiredToken = (
  kind: 'access' | 'refresh',
  userId: string,
  roles: string[] = ['student'],
): string =>
  kind === 'access'
    ? jwt.sign({ sub: userId, roles, type: 'access' }, env.jwt.accessSecret, {
        expiresIn: '-1h',
      })
    : jwt.sign(
        { sub: userId, jti: 'expired-jti', type: 'refresh' },
        env.jwt.refreshSecret,
        { expiresIn: '-1h' },
      );

const registerBody = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  fullName: 'Amina Yusuf',
  email: 'amina@example.com',
  password: PASSWORD,
  ...overrides,
});

const loginAs = async (
  email: string,
  password = PASSWORD,
): Promise<{ token: string; id: string }> => {
  const response = await request(app).post('/api/v1/auth/login').send({ email, password });

  expect(response.status).toBe(200);
  return {
    token: response.body.data.accessToken,
    id: response.body.data.user.id,
  };
};

beforeAll(async () => {
  // The connection below always targets TEST_DB explicitly, so the only way to
  // endanger real data would be for TEST_DB itself to name a real database.
  // These assertions make that a loud failure instead of a dropped collection.
  expect(TEST_DB).toContain('_test');
  expect(TEST_DB).not.toBe(env.mongoUri.split('/')[3]?.split('?')[0]);

  await mongoose.connect(env.mongoUri, { dbName: TEST_DB });
  await mongoose.connection.dropDatabase();
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
  }
  await mongoose.connection.close();
});

afterEach(async () => {
  // Keep accounts between tests where a suite needs them, but never sessions.
  await User.updateMany({}, { $set: { refreshTokens: [] } });
});

/* -------------------------------------------------------------------------- */
/* Registration                                                                */
/* -------------------------------------------------------------------------- */

describe('POST /api/v1/auth/register', () => {
  it('creates a student, sets an httpOnly refresh cookie and returns an access token', async () => {
    const response = await request(app).post('/api/v1/auth/register').send(registerBody());

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user).toMatchObject({
      email: 'amina@example.com',
      roles: ['student'],
      status: 'active',
    });
    expect(typeof response.body.data.accessToken).toBe('string');

    const cookie = response.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toContain(`${REFRESH_TOKEN.COOKIE_NAME}=`);
    expect(cookie).toContain('HttpOnly');
  });

  it('never returns the password hash or the refresh token in the body', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(registerBody({ email: 'hash@example.com' }));

    const serialised = JSON.stringify(response.body);
    expect(serialised).not.toContain('$2a$');
    expect(serialised).not.toContain('$2b$');
    expect(response.body.data.user.password).toBeUndefined();
    expect(response.body.data.refreshToken).toBeUndefined();
  });

  it('stores a bcrypt hash, never the plaintext password', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send(registerBody({ email: 'stored@example.com' }));

    const stored = await User.findOne({ email: 'stored@example.com' }).select('+password');
    expect(stored?.password).not.toBe(PASSWORD);
    expect(stored?.password).toMatch(/^\$2[aby]\$/);
    await expect(stored?.comparePassword(PASSWORD)).resolves.toBe(true);
  });

  it('ignores a requested admin role and still creates a student', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(registerBody({ email: 'sneaky@example.com', role: 'admin' }));

    expect(response.status).toBe(201);
    expect(response.body.data.user.roles).toEqual(['student']);

    const stored = await User.findOne({ email: 'sneaky@example.com' });
    expect(stored?.roles).toEqual(['student']);
  });

  it('ignores a requested instructor role', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(registerBody({ email: 'sneaky2@example.com', role: 'instructor' }));

    expect(response.body.data.user.roles).toEqual(['student']);
  });

  it('rejects a duplicate email with 409', async () => {
    await request(app).post('/api/v1/auth/register').send(registerBody({ email: 'dupe@example.com' }));

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(registerBody({ email: 'dupe@example.com' }));

    expect(response.status).toBe(409);
  });

  it('rejects a weak password with 422 and field errors', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(registerBody({ email: 'weak@example.com', password: 'short' }));

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(response.body.errors).toBeDefined();
  });

  it('rejects a malformed email with 422', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(registerBody({ email: 'not-an-email' }));

    expect(response.status).toBe(422);
  });

  it('never echoes the submitted password back in an error', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(registerBody({ email: 'nope@example.com', password: 'weakpassword' }));

    expect(JSON.stringify(response.body)).not.toContain('weakpassword');
  });
});

/* -------------------------------------------------------------------------- */
/* Login                                                                       */
/* -------------------------------------------------------------------------- */

describe('POST /api/v1/auth/login', () => {
  beforeAll(async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send(registerBody({ email: 'login@example.com' }));
  });

  it('returns an access token and refresh cookie for valid credentials', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'login@example.com', password: PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe('login@example.com');
    expect(typeof response.body.data.accessToken).toBe('string');
    expect(response.headers['set-cookie']?.[0]).toContain(REFRESH_TOKEN.COOKIE_NAME);
  });

  it('accepts a differently cased email', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'LOGIN@Example.com', password: PASSWORD });

    expect(response.status).toBe(200);
  });

  it('rejects a wrong password with 401', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'login@example.com', password: 'WrongPass1' });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Invalid email or password');
  });

  it('rejects an unknown email with the same 401 message, without leaking which failed', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ghost@example.com', password: PASSWORD });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Invalid email or password');
  });

  it('rejects a missing password with 422', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'login@example.com' });

    expect(response.status).toBe(422);
  });

  it('refuses a suspended account with 403', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send(registerBody({ email: 'suspended@example.com' }));
    await User.updateOne({ email: 'suspended@example.com' }, { $set: { status: 'suspended' } });

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'suspended@example.com', password: PASSWORD });

    expect(response.status).toBe(403);
    expect(response.body.message).toMatch(/suspended/i);
  });

  it('never returns the password hash on login', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'login@example.com', password: PASSWORD });

    expect(JSON.stringify(response.body)).not.toMatch(/\$2[aby]\$/);
  });
});

/* -------------------------------------------------------------------------- */
/* Access token verification and expiry                                        */
/* -------------------------------------------------------------------------- */

describe('GET /api/v1/auth/me', () => {
  let token: string;
  let id: string;

  beforeAll(async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send(registerBody({ email: 'me@example.com' }));
    ({ token, id } = await loginAs('me@example.com'));
  });

  it('returns the caller profile for a valid access token', async () => {
    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(id);
    expect(response.body.data.email).toBe('me@example.com');
  });

  it('never includes the hash, password or refresh tokens', async () => {
    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    const serialised = JSON.stringify(response.body);
    expect(serialised).not.toMatch(/\$2[aby]\$/);
    expect(response.body.data.password).toBeUndefined();
    expect(response.body.data.refreshTokens).toBeUndefined();
    expect(response.body.data.passwordChangedAt).toBeUndefined();
  });

  it('rejects a request with no Authorization header with 401', async () => {
    const response = await request(app).get('/api/v1/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/missing/i);
  });

  it('rejects a malformed header with 401', async () => {
    const response = await request(app).get('/api/v1/auth/me').set('Authorization', token);

    expect(response.status).toBe(401);
  });

  it('rejects an expired access token with 401', async () => {
    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${expiredToken('access', id)}`);

    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/invalid or expired/i);
  });

  it('rejects a token signed with the wrong secret with 401', async () => {
    const forged = jwt.sign({ sub: id, roles: ['student'], type: 'access' }, 'not-the-real-secret', {
      expiresIn: '15m',
    });

    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${forged}`);

    expect(response.status).toBe(401);
  });

  it('rejects a refresh token presented as an access token with 401', async () => {
    const refresh = jwt.sign({ sub: id, jti: 'x', type: 'refresh' }, env.jwt.refreshSecret, {
      expiresIn: '7d',
    });

    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${refresh}`);

    // The token is signed with the refresh secret, so it fails signature
    // verification before the type check is ever reached. Either way: 401.
    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/invalid or expired|invalid token type/i);
  });

  it('rejects a correctly signed token of the wrong type with a type-specific 401', async () => {
    // Signed with the *access* secret but declared as a refresh token, which is
    // the case the explicit type guard exists for.
    const wrongType = jwt.sign({ sub: id, roles: ['student'], type: 'refresh' }, env.jwt.accessSecret, {
      expiresIn: '15m',
    });

    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${wrongType}`);

    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/invalid token type/i);
  });

  it('rejects a valid token for a deleted account with 401', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send(registerBody({ email: 'ghost-user@example.com' }));
    const session = await loginAs('ghost-user@example.com');
    await User.updateOne({ email: 'ghost-user@example.com' }, { $set: { isDeleted: true } });

    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${session.token}`);

    expect(response.status).toBe(401);
  });

  it('rejects a refresh token belonging to a deleted account with 401', async () => {
    const register = await request(app)
      .post('/api/v1/auth/register')
      .send(registerBody({ email: 'ghost-refresh@example.com' }));
    const cookie = register.headers['set-cookie']?.[0]?.split(';')[0] ?? '';

    await User.updateOne({ email: 'ghost-refresh@example.com' }, { $set: { isDeleted: true } });

    const response = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie);

    expect(response.status).toBe(401);
  });

  it('refuses to sign in again after an account is deleted', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send(registerBody({ email: 'deleted-login@example.com' }));
    await User.updateOne({ email: 'deleted-login@example.com' }, { $set: { isDeleted: true } });

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'deleted-login@example.com', password: PASSWORD });

    expect(response.status).toBe(401);
  });
});

/* -------------------------------------------------------------------------- */
/* Refresh rotation                                                            */
/* -------------------------------------------------------------------------- */

describe('POST /api/v1/auth/refresh', () => {
  it('rotates the refresh token and issues a new access token', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send(registerBody({ email: 'rotate@example.com' }));

    const agent = request.agent(app);
    const first = await agent.post('/api/v1/auth/login').send({
      email: 'rotate@example.com',
      password: PASSWORD,
    });
    expect(first.status).toBe(200);

    const firstCookie = first.headers['set-cookie']?.[0] ?? '';
    const firstToken = firstCookie.split(';')[0].split('=')[1];

    const second = await agent.post('/api/v1/auth/refresh').send();

    expect(second.status).toBe(200);
    expect(typeof second.body.data.accessToken).toBe('string');
    // The rotated cookie must be a genuinely different token.
    expect(second.headers['set-cookie']?.[0]?.split(';')[0]).not.toBe(firstCookie.split(';')[0]);
    expect(firstToken).toBeTruthy();
  });

  it('rejects a replayed refresh token after rotation with 401', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send(registerBody({ email: 'replay@example.com' }));

    const register = await request(app)
      .post('/api/v1/auth/register')
      .send(registerBody({ email: 'replay2@example.com' }));

    const staleCookie = register.headers['set-cookie']?.[0]?.split(';')[0] ?? '';
    const staleToken = staleCookie.split('=')[1];

    // Rotate once, which consumes the token.
    const rotated = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', staleCookie);
    expect(rotated.status).toBe(200);

    // Presenting the same token again must fail.
    const replayed = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `${REFRESH_TOKEN.COOKIE_NAME}=${staleToken}`);

    expect(replayed.status).toBe(401);
    expect(replayed.body.message).toMatch(/no longer valid/i);
  });

  it('rejects an expired refresh token with 401', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send(registerBody({ email: 'stale@example.com' }));
    const user = await User.findOne({ email: 'stale@example.com' });

    const response = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `${REFRESH_TOKEN.COOKIE_NAME}=${expiredToken('refresh', String(user!._id))}`);

    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/invalid or expired/i);
  });

  it('rejects a refresh cookie signed with the wrong secret with 401', async () => {
    const forged = jwt.sign({ sub: '65f0000000000000000000a1', jti: 'x', type: 'refresh' }, 'wrong', {
      expiresIn: '7d',
    });

    const response = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `${REFRESH_TOKEN.COOKIE_NAME}=${forged}`);

    expect(response.status).toBe(401);
  });

  it('rejects a missing refresh cookie with 401', async () => {
    const response = await request(app).post('/api/v1/auth/refresh').send();

    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/no refresh token/i);
  });
});

/* -------------------------------------------------------------------------- */
/* Logout                                                                      */
/* -------------------------------------------------------------------------- */

describe('POST /api/v1/auth/logout', () => {
  it('invalidates the refresh session so it cannot be used again', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send(registerBody({ email: 'logout@example.com' }));

    const register = await request(app)
      .post('/api/v1/auth/register')
      .send(registerBody({ email: 'logout2@example.com' }));
    const cookie = register.headers['set-cookie']?.[0]?.split(';')[0] ?? '';

    const loggedOut = await request(app).post('/api/v1/auth/logout').set('Cookie', cookie);
    expect(loggedOut.status).toBe(200);

    const reused = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie);
    expect(reused.status).toBe(401);
  });

  it('clears the refresh cookie', async () => {
    const response = await request(app).post('/api/v1/auth/logout');

    expect(response.status).toBe(200);
    const cleared = response.headers['set-cookie']?.[0] ?? '';
    expect(cleared).toContain(`${REFRESH_TOKEN.COOKIE_NAME}=`);
  });

  it('is safe to call without a session', async () => {
    const response = await request(app).post('/api/v1/auth/logout');

    expect(response.status).toBe(200);
  });
});

/* -------------------------------------------------------------------------- */
/* Role authorization                                                          */
/* -------------------------------------------------------------------------- */

describe('role-based authorization', () => {
  let adminToken: string;

  beforeAll(async () => {
    // Seeded directly so the suite does not depend on the CLI bootstrap path.
    // The hash is produced with the real helper rather than pasted in, so it
    // cannot drift from the password it is meant to represent.
    await User.deleteMany({ email: 'root@example.com' });
    await User.create({
      fullName: 'Root Admin',
      email: 'root@example.com',
      password: await hashPassword(PASSWORD),
      roles: ['admin'],
    });

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'root@example.com', password: PASSWORD });
    expect(response.status).toBe(200);
    adminToken = response.body.data.accessToken;
  });

  it('lets an admin create an instructor account', async () => {
    const response = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Elena Vargas',
        email: 'elena@example.com',
        password: PASSWORD,
        role: 'instructor',
      });

    expect(response.status).toBe(201);
    expect(response.body.data.roles).toEqual(['instructor']);
    expect(response.body.data.password).toBeUndefined();

    // The account must be usable for a real sign-in.
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'elena@example.com', password: PASSWORD });
    expect(login.status).toBe(200);
  });

  it('refuses to create a student through the admin endpoint', async () => {
    const response = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName: 'Nope', email: 'nope@example.com', password: PASSWORD, role: 'student' });

    expect(response.status).toBe(422);
    expect(JSON.stringify(response.body.errors)).toMatch(/instructor/i);
  });

  it('forbids a student from creating an instructor with 403', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send(registerBody({ email: 'student-actor@example.com' }));
    const { token } = await loginAs('student-actor@example.com');

    const response = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'Mallory', email: 'mallory@example.com', password: PASSWORD, role: 'instructor' });

    expect(response.status).toBe(403);
  });

  it('rejects an anonymous attempt to create an instructor with 401', async () => {
    const response = await request(app)
      .post('/api/v1/users')
      .send({ fullName: 'Anon', email: 'anon@example.com', password: PASSWORD, role: 'instructor' });

    expect(response.status).toBe(401);
  });

  it('forbids a student from reaching the user list with 403', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send(registerBody({ email: 'list-denied@example.com' }));
    const { token } = await loginAs('list-denied@example.com');

    const response = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  it('forbids a student from reaching the admin dashboard with 403', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send(registerBody({ email: 'dash-denied@example.com' }));
    const { token } = await loginAs('dash-denied@example.com');

    const response = await request(app)
      .get('/api/v1/dashboard/admin')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  it('lets an admin reach the admin dashboard', async () => {
    const response = await request(app)
      .get('/api/v1/dashboard/admin')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
  });

  it('returns 401 rather than 403 when an expired token hits a protected route', async () => {
    const response = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${expiredToken('access', '65f0000000000000000000a1', ['admin'])}`);

    expect(response.status).toBe(401);
  });
});
