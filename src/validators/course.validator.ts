import { z } from 'zod';
import { COURSE_LEVELS, COURSE_SORT_OPTIONS, COURSE_STATUSES } from '../constants';
import { objectIdSchema, paginationSchema, safeUrlSchema } from './auth.validator';

export const courseSortSchema = z.enum(COURSE_SORT_OPTIONS).default('newest');

export const listCoursesSchema = paginationSchema.extend({
  search: z.string().trim().max(120).optional(),
  category: objectIdSchema.optional(),
  level: z.enum(COURSE_LEVELS).optional(),
  status: z.enum(COURSE_STATUSES).optional(),
  instructor: objectIdSchema.optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: courseSortSchema,
  tag: z.string().trim().max(40).optional(),
});

export const createCourseSchema = z.object({
  title: z.string().trim().min(5, 'Title must be at least 5 characters').max(120),
  description: z
    .string()
    .trim()
    .min(20, 'Description must be at least 20 characters')
    .max(2000),
  shortDescription: z.string().trim().max(200).optional(),
  thumbnailUrl: safeUrlSchema.optional(),
  category: objectIdSchema,
  // Only an admin may assign a different owner; an instructor always owns
  // what they create. The service enforces the final rule.
  instructor: objectIdSchema.optional(),
  level: z.enum(COURSE_LEVELS).default('beginner'),
  price: z.coerce.number().min(0, 'Price cannot be negative').default(0),
  currency: z.string().trim().length(3).toUpperCase().default('USD'),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  outcomes: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
  requirements: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
});

/**
 * `.partial()` makes every field optional, but the empty object is rejected so
 * a no-op PATCH cannot slip through.
 */
export const updateCourseSchema = createCourseSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const courseStatusSchema = z.object({
  status: z.enum(COURSE_STATUSES).optional(),
});

/** Admin-only reassignment of a course's owner. */
export const assignInstructorSchema = z.object({
  instructor: objectIdSchema,
});

export const courseAnalyticsQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const createRatingSchema = z.object({
  value: z.coerce.number().int().min(1, 'Rating must be between 1 and 5').max(5),
  review: z.string().trim().max(1000, 'Review must be at most 1000 characters').optional(),
});

export const rosterQuerySchema = paginationSchema.extend({
  status: z.enum(['active', 'completed', 'cancelled']).optional(),
  search: z.string().trim().max(120).optional(),
});

export const courseParamsSchema = z.object({ id: objectIdSchema });
export const courseSlugParamsSchema = z.object({ slug: z.string().trim().min(1) });

export type ListCoursesInput = z.infer<typeof listCoursesSchema>;
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type AssignInstructorInput = z.infer<typeof assignInstructorSchema>;
export type CreateRatingInput = z.infer<typeof createRatingSchema>;
