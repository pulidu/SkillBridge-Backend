"use strict";
/**
 * Shared enums and defaults. Models, validators and services all import from
 * here so a value is never declared twice.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.COURSE_SORT_OPTIONS = exports.CERTIFICATE_PREFIX = exports.REFRESH_TOKEN = exports.PAGINATION = exports.NOTIFICATION_TYPES = exports.SUBMISSION_STATUSES = exports.ENROLLMENT_STATUSES = exports.QUESTION_TYPES = exports.LESSON_TYPES = exports.COURSE_LEVELS = exports.COURSE_STATUSES = exports.USER_STATUSES = exports.ROLES = void 0;
exports.ROLES = ['admin', 'instructor', 'student'];
exports.USER_STATUSES = ['active', 'suspended'];
exports.COURSE_STATUSES = ['draft', 'published', 'archived'];
exports.COURSE_LEVELS = ['beginner', 'intermediate', 'advanced'];
exports.LESSON_TYPES = ['video', 'article', 'quiz', 'assignment'];
exports.QUESTION_TYPES = ['single', 'multiple', 'truefalse', 'short'];
exports.ENROLLMENT_STATUSES = ['active', 'completed', 'cancelled'];
exports.SUBMISSION_STATUSES = ['submitted', 'graded', 'returned'];
exports.NOTIFICATION_TYPES = [
    'enrollment',
    'course_update',
    'grade',
    'announcement',
    'system',
];
exports.PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
};
exports.REFRESH_TOKEN = {
    MAX_PER_USER: 5,
    COOKIE_NAME: 'sid',
};
exports.CERTIFICATE_PREFIX = 'SB';
exports.COURSE_SORT_OPTIONS = [
    'newest',
    'oldest',
    'title',
    'rating',
    'popular',
    'duration',
];
//# sourceMappingURL=index.js.map