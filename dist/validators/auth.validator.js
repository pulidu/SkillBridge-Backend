"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStatusSchema = exports.updateRoleSchema = exports.updateUserSchema = exports.listUsersSchema = exports.createUserSchema = exports.changePasswordSchema = exports.updateProfileSchema = exports.loginSchema = exports.registerSchema = exports.paginationSchema = exports.booleanQuery = exports.idParamSchema = exports.safeUrlSchema = exports.objectIdSchema = exports.emailSchema = exports.passwordSchema = exports.PRIVILEGED_ROLES = void 0;
const zod_1 = require("zod");
const constants_1 = require("../constants");
/** Roles an administrator may hand out. `student` is never included. */
exports.PRIVILEGED_ROLES = ['instructor', 'admin'];
/** Password policy: 8+ chars with at least one letter and one number. */
exports.passwordSchema = zod_1.z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number');
exports.emailSchema = zod_1.z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Email is required')
    .email('Enter a valid email address');
exports.objectIdSchema = zod_1.z
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
exports.safeUrlSchema = zod_1.z
    .string()
    .trim()
    .max(500, 'URL must be at most 500 characters')
    .url('Enter a valid URL')
    .refine((value) => /^https?:\/\//i.test(value), {
    message: 'URL must start with http:// or https://',
});
/** A JSON object id may arrive as string or ObjectId-like value. */
exports.idParamSchema = zod_1.z.object({ id: exports.objectIdSchema });
/** Coerces query-string values (everything arrives as a string). */
exports.booleanQuery = zod_1.z
    .union([zod_1.z.boolean(), zod_1.z.string()])
    .transform((value) => value === true || value === 'true');
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(constants_1.PAGINATION.DEFAULT_PAGE),
    limit: zod_1.z.coerce.number().int().positive().max(constants_1.PAGINATION.MAX_LIMIT).default(constants_1.PAGINATION.DEFAULT_LIMIT),
});
exports.registerSchema = zod_1.z.object({
    fullName: zod_1.z.string().trim().min(2, 'Full name must be at least 2 characters').max(80),
    email: exports.emailSchema,
    password: exports.passwordSchema,
    // Accepted for UI convenience but ignored by the service: role is always
    // forced to `student` on self-registration.
    role: zod_1.z.enum(constants_1.ROLES).optional(),
});
exports.loginSchema = zod_1.z.object({
    email: exports.emailSchema,
    password: zod_1.z.string().min(1, 'Password is required'),
});
exports.updateProfileSchema = zod_1.z.object({
    fullName: zod_1.z.string().trim().min(2).max(80).optional(),
    avatarUrl: exports.safeUrlSchema.optional(),
    bio: zod_1.z.string().trim().max(500, 'Bio must be at most 500 characters').optional(),
});
exports.changePasswordSchema = zod_1.z
    .object({
    currentPassword: zod_1.z.string().min(1, 'Current password is required'),
    newPassword: exports.passwordSchema,
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
exports.createUserSchema = zod_1.z.object({
    fullName: zod_1.z.string().trim().min(2, 'Full name must be at least 2 characters').max(80),
    email: exports.emailSchema,
    password: exports.passwordSchema,
    role: zod_1.z.enum(exports.PRIVILEGED_ROLES, {
        required_error: 'Role is required',
        invalid_type_error: 'Role must be one of: instructor, admin',
    }),
    bio: zod_1.z.string().trim().max(500).optional(),
});
exports.listUsersSchema = exports.paginationSchema.extend({
    role: zod_1.z.enum(constants_1.ROLES).optional(),
    status: zod_1.z.enum(constants_1.USER_STATUSES).optional(),
    search: zod_1.z.string().trim().max(120).optional(),
});
exports.updateUserSchema = zod_1.z.object({
    fullName: zod_1.z.string().trim().min(2).max(80).optional(),
    email: exports.emailSchema.optional(),
    bio: zod_1.z.string().trim().max(500).optional(),
    avatarUrl: exports.safeUrlSchema.optional(),
});
exports.updateRoleSchema = zod_1.z.object({
    role: zod_1.z.enum(constants_1.ROLES, { required_error: 'Role is required' }),
});
exports.updateStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(constants_1.USER_STATUSES, { required_error: 'Status is required' }),
});
//# sourceMappingURL=auth.validator.js.map