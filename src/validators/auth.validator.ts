import { z } from 'zod';
import { PAGINATION, USER_STATUSES, ROLES } from '../constants';

/** Roles an administrator may hand out. `student` is never included. */
export const PRIVILEGED_ROLES = ['instructor', 'admin'] as const;


/** Password policy: 8+ chars with at least one letter and one number. */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Email is required')
  .email('Enter a valid email address');

export const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-fA-F0-9]{24}$/, 'Invalid identifier');

/**
 * A URL that is safe to store and render.
 *
 * Zod's `.url()` accepts any syntactically valid URL, including
 * `javascript:alert(1)` and `data:` payloads, which would become a stored XSS
 * vector once rendered as an `img src` or link. Only http(s) is allowed.
 */
export const safeUrlSchema = z
  .string()
  .trim()
  .max(500, 'URL must be at most 500 characters')
  .url('Enter a valid URL')
  .refine((value) => /^https?:\/\//i.test(value), {
    message: 'URL must start with http:// or https://',
  });

/** A JSON object id may arrive as string or ObjectId-like value. */
export const idParamSchema = z.object({ id: objectIdSchema });

/** Coerces query-string values (everything arrives as a string). */
export const booleanQuery = z
  .union([z.boolean(), z.string()])
  .transform((value) => value === true || value === 'true');

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce.number().int().positive().max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT),
});

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(80),
  email: emailSchema,
  password: passwordSchema,
  // Accepted for UI convenience but ignored by the service: role is always
  // forced to `student` on self-registration.
  role: z.enum(ROLES).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(80).optional(),
  avatarUrl: safeUrlSchema.optional(),
  bio: z.string().trim().max(500, 'Bio must be at most 500 characters').optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from the current one',
    path: ['newPassword'],
  });

/**
 * Admin-only account creation.
 *
 * The role is deliberately restricted to the two privileged roles and the route
 * is additionally gated by `authorize('admin')`, so an instructor can never
 * reach this schema. `student` accounts are created through public
 * self-registration, which cannot grant a privileged role.
 */
export const createUserSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(80),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(PRIVILEGED_ROLES, {
    required_error: 'Role is required',
    invalid_type_error: 'Role must be one of: instructor, admin',
  }),
  bio: z.string().trim().max(500).optional(),
});

export const listUsersSchema = paginationSchema.extend({
  role: z.enum(ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
  search: z.string().trim().max(120).optional(),
});

export const updateUserSchema = z.object({
  fullName: z.string().trim().min(2).max(80).optional(),
  email: emailSchema.optional(),
  bio: z.string().trim().max(500).optional(),
  avatarUrl: safeUrlSchema.optional(),
});

export const updateRoleSchema = z.object({
  role: z.enum(ROLES, { required_error: 'Role is required' }),
});

export const updateStatusSchema = z.object({
  status: z.enum(USER_STATUSES, { required_error: 'Status is required' }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ListUsersInput = z.infer<typeof listUsersSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
