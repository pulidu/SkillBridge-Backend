/**
 * Shared enums and defaults. Models, validators and services all import from
 * here so a value is never declared twice.
 */

export const ROLES = ['admin', 'instructor', 'student'] as const;
export type Role = (typeof ROLES)[number];

export const USER_STATUSES = ['active', 'suspended'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const COURSE_STATUSES = ['draft', 'published', 'archived'] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export const COURSE_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type CourseLevel = (typeof COURSE_LEVELS)[number];

export const LESSON_TYPES = ['video', 'article', 'quiz', 'assignment'] as const;
export type LessonType = (typeof LESSON_TYPES)[number];

export const QUESTION_TYPES = ['single', 'multiple', 'truefalse', 'short'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const ENROLLMENT_STATUSES = ['active', 'completed', 'cancelled'] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export const SUBMISSION_STATUSES = ['submitted', 'graded', 'returned'] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  'enrollment',
  'course_update',
  'grade',
  'announcement',
  'system',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const REFRESH_TOKEN = {
  MAX_PER_USER: 5,
  COOKIE_NAME: 'sid',
} as const;

export const CERTIFICATE_PREFIX = 'SB';

export const COURSE_SORT_OPTIONS = [
  'newest',
  'oldest',
  'title',
  'rating',
  'popular',
  'duration',
] as const;
export type CourseSort = (typeof COURSE_SORT_OPTIONS)[number];
