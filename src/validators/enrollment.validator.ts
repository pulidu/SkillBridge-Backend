import { z } from 'zod';
import { ENROLLMENT_STATUSES, NOTIFICATION_TYPES, SUBMISSION_STATUSES } from '../constants';
import { booleanQuery, objectIdSchema, paginationSchema, safeUrlSchema } from './auth.validator';

/* -------------------------------------------------------------------------- */
/* Enrollments                                                                 */
/* -------------------------------------------------------------------------- */

export const createEnrollmentSchema = z.object({
  course: objectIdSchema,
  // Present for admin-initiated enrolment; ignored for self-enrolment.
  student: objectIdSchema.optional(),
});

export const listEnrollmentsSchema = paginationSchema.extend({
  course: objectIdSchema.optional(),
  student: objectIdSchema.optional(),
  status: z.enum(ENROLLMENT_STATUSES).optional(),
});

export const updateEnrollmentSchema = z.object({
  status: z.enum(ENROLLMENT_STATUSES).optional(),
  finalScore: z.coerce.number().min(0).max(100).optional(),
});

export const enrollmentIdParamsSchema = z.object({ id: objectIdSchema });
export const enrollmentStudentParamsSchema = z.object({ studentId: objectIdSchema });

/* -------------------------------------------------------------------------- */
/* Progress                                                                    */
/* -------------------------------------------------------------------------- */

export const lessonActionParamsSchema = z.object({ lessonId: objectIdSchema });
export const progressEnrollmentParamsSchema = z.object({ enrollmentId: objectIdSchema });

/* -------------------------------------------------------------------------- */
/* Submissions                                                                 */
/* -------------------------------------------------------------------------- */

export const submissionAttachmentSchema = z.object({
  name: z.string().trim().min(1).max(200),
  url: safeUrlSchema,
  size: z.coerce.number().min(0).default(0),
  mimeType: z.string().trim().max(120).optional(),
});

const answerFields = {
  answerText: z.string().trim().max(20_000).optional(),
  answerURL: safeUrlSchema.optional(),
  attachments: z.array(submissionAttachmentSchema).max(10).default([]),
};

/** A submission is only meaningful if the learner actually answered something. */
const hasAnswer = (value: {
  answerText?: string;
  answerURL?: string;
  attachments: unknown[];
}): boolean => Boolean(value.answerText || value.answerURL) || value.attachments.length > 0;

/** Preferred path: answer a first-class assignment. */
export const assignmentSubmissionSchema = z
  .object({ assignment: objectIdSchema, ...answerFields })
  .refine(hasAnswer, {
    message: 'Provide answerText, answerURL, or an attachment',
  });

/** Legacy path: answer an assignment-type lesson. */
export const lessonSubmissionSchema = z.object({
  course: objectIdSchema,
  lesson: objectIdSchema,
  content: z.string().trim().min(1, 'Submission cannot be empty').max(20_000),
  attachments: z.array(submissionAttachmentSchema).max(10).default([]),
});

export const createSubmissionSchema = z.union([
  assignmentSubmissionSchema,
  lessonSubmissionSchema,
]);

export const listSubmissionsSchema = paginationSchema.extend({
  course: objectIdSchema.optional(),
  student: objectIdSchema.optional(),
  status: z.enum(SUBMISSION_STATUSES).optional(),
});

export const gradeSubmissionSchema = z.object({
  grade: z.coerce.number().min(0, 'Grade cannot be negative').max(100),
  feedback: z.string().trim().max(2000).optional(),
  status: z.enum(['graded', 'returned']).default('graded'),
});

export const submissionIdParamsSchema = z.object({ id: objectIdSchema });

/* -------------------------------------------------------------------------- */
/* Notifications                                                               */
/* -------------------------------------------------------------------------- */

export const listNotificationsSchema = paginationSchema.extend({
  unread: booleanQuery.optional(),
  type: z.enum(NOTIFICATION_TYPES).optional(),
});

export const notificationIdParamsSchema = z.object({ id: objectIdSchema });
export const certificateSerialParamsSchema = z.object({
  serialNumber: z.string().trim().min(4).max(64),
});

/* -------------------------------------------------------------------------- */
/* Audit logs                                                                  */
/* -------------------------------------------------------------------------- */

export const listAuditLogsSchema = paginationSchema.extend({
  actor: objectIdSchema.optional(),
  entity: z.string().trim().max(40).optional(),
  action: z.string().trim().max(60).optional(),
});

export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;
export type ListEnrollmentsInput = z.infer<typeof listEnrollmentsSchema>;
export type UpdateEnrollmentInput = z.infer<typeof updateEnrollmentSchema>;
export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
export type ListSubmissionsInput = z.infer<typeof listSubmissionsSchema>;
export type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>;
export type ListNotificationsInput = z.infer<typeof listNotificationsSchema>;
