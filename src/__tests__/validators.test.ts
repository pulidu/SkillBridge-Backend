import { describe, expect, it } from 'vitest';
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
  updateProfileSchema,
} from '../validators/auth.validator';

describe('registerSchema', () => {
  it('accepts a valid learner registration', () => {
    const result = registerSchema.safeParse({
      fullName: 'Amina Yusuf',
      email: 'Amina@Example.com',
      password: 'secret123',
    });

    expect(result.success).toBe(true);
    // Email is normalised so the same person cannot register twice in two cases.
    expect(result.success && result.data.email).toBe('amina@example.com');
  });

  it('rejects a malformed email', () => {
    expect(
      registerSchema.safeParse({ fullName: 'Amina', email: 'not-an-email', password: 'secret123' })
        .success,
    ).toBe(false);
  });

  it('rejects a password without a number', () => {
    expect(
      registerSchema.safeParse({ fullName: 'Amina', email: 'a@b.com', password: 'abcdefgh' }).success,
    ).toBe(false);
  });

  it('rejects a password without a letter', () => {
    expect(
      registerSchema.safeParse({ fullName: 'Amina', email: 'a@b.com', password: '12345678' }).success,
    ).toBe(false);
  });

  it('rejects a short password', () => {
    expect(
      registerSchema.safeParse({ fullName: 'Amina', email: 'a@b.com', password: 'ab1' }).success,
    ).toBe(false);
  });

  it('rejects a full name that is too short', () => {
    expect(
      registerSchema.safeParse({ fullName: 'A', email: 'a@b.com', password: 'secret123' }).success,
    ).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'anything' }).success).toBe(true);
  });

  it('does not apply the password policy, so old passwords still work', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'old' }).success).toBe(true);
  });
});

describe('changePasswordSchema', () => {
  it('rejects reusing the current password', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'secret123',
      newPassword: 'secret123',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a different, policy-compliant password', () => {
    expect(
      changePasswordSchema.safeParse({ currentPassword: 'secret123', newPassword: 'newpass456' })
        .success,
    ).toBe(true);
  });
});

describe('updateProfileSchema', () => {
  it('rejects a non-URL avatar', () => {
    expect(updateProfileSchema.safeParse({ avatarUrl: 'javascript:alert(1)' }).success).toBe(false);
  });

  it('accepts an empty patch as valid (nothing to change)', () => {
    expect(updateProfileSchema.safeParse({}).success).toBe(true);
  });
});
