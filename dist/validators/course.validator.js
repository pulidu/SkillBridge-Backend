"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.courseSlugParamsSchema = exports.courseParamsSchema = exports.rosterQuerySchema = exports.createRatingSchema = exports.courseAnalyticsQuerySchema = exports.assignInstructorSchema = exports.courseStatusSchema = exports.updateCourseSchema = exports.createCourseSchema = exports.listCoursesSchema = exports.courseSortSchema = void 0;
const zod_1 = require("zod");
const constants_1 = require("../constants");
const auth_validator_1 = require("./auth.validator");
exports.courseSortSchema = zod_1.z.enum(constants_1.COURSE_SORT_OPTIONS).default('newest');
exports.listCoursesSchema = auth_validator_1.paginationSchema.extend({
    search: zod_1.z.string().trim().max(120).optional(),
    category: auth_validator_1.objectIdSchema.optional(),
    level: zod_1.z.enum(constants_1.COURSE_LEVELS).optional(),
    status: zod_1.z.enum(constants_1.COURSE_STATUSES).optional(),
    instructor: auth_validator_1.objectIdSchema.optional(),
    minRating: zod_1.z.coerce.number().min(0).max(5).optional(),
    maxPrice: zod_1.z.coerce.number().min(0).optional(),
    sort: exports.courseSortSchema,
    tag: zod_1.z.string().trim().max(40).optional(),
});
exports.createCourseSchema = zod_1.z.object({
    title: zod_1.z.string().trim().min(5, 'Title must be at least 5 characters').max(120),
    description: zod_1.z
        .string()
        .trim()
        .min(20, 'Description must be at least 20 characters')
        .max(2000),
    shortDescription: zod_1.z.string().trim().max(200).optional(),
    thumbnailUrl: auth_validator_1.safeUrlSchema.optional(),
    category: auth_validator_1.objectIdSchema,
    // Only an admin may assign a different owner; an instructor always owns
    // what they create. The service enforces the final rule.
    instructor: auth_validator_1.objectIdSchema.optional(),
    level: zod_1.z.enum(constants_1.COURSE_LEVELS).default('beginner'),
    price: zod_1.z.coerce.number().min(0, 'Price cannot be negative').default(0),
    currency: zod_1.z.string().trim().length(3).toUpperCase().default('USD'),
    tags: zod_1.z.array(zod_1.z.string().trim().min(1).max(40)).max(10).default([]),
    outcomes: zod_1.z.array(zod_1.z.string().trim().min(1).max(200)).max(20).default([]),
    requirements: zod_1.z.array(zod_1.z.string().trim().min(1).max(200)).max(20).default([]),
});
/**
 * `.partial()` makes every field optional, but the empty object is rejected so
 * a no-op PATCH cannot slip through.
 */
exports.updateCourseSchema = exports.createCourseSchema
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
});
exports.courseStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(constants_1.COURSE_STATUSES).optional(),
});
/** Admin-only reassignment of a course's owner. */
exports.assignInstructorSchema = zod_1.z.object({
    instructor: auth_validator_1.objectIdSchema,
});
exports.courseAnalyticsQuerySchema = zod_1.z.object({
    from: zod_1.z.coerce.date().optional(),
    to: zod_1.z.coerce.date().optional(),
});
exports.createRatingSchema = zod_1.z.object({
    value: zod_1.z.coerce.number().int().min(1, 'Rating must be between 1 and 5').max(5),
    review: zod_1.z.string().trim().max(1000, 'Review must be at most 1000 characters').optional(),
});
exports.rosterQuerySchema = auth_validator_1.paginationSchema.extend({
    status: zod_1.z.enum(['active', 'completed', 'cancelled']).optional(),
    search: zod_1.z.string().trim().max(120).optional(),
});
exports.courseParamsSchema = zod_1.z.object({ id: auth_validator_1.objectIdSchema });
exports.courseSlugParamsSchema = zod_1.z.object({ slug: zod_1.z.string().trim().min(1) });
//# sourceMappingURL=course.validator.js.map