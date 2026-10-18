import { Types, type HydratedDocument } from 'mongoose';
import type { Request } from 'express';
import {
  Assignment,
  Course,
  Enrollment,
  gradePercentage,
  Lesson,
  Submission,
  type IEnrollment,
} from '../models';
import type { AuthUser, PaginatedResult } from '../types';
import { ApiError } from '../utils/ApiError';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import type {
  CreateSubmissionInput,
  GradeSubmissionInput,
  ListSubmissionsInput,
} from '../validators/enrollment.validator';
import { recordAudit } from './audit.service';
import { createNotification } from './notification.service';

const SUBMISSION_POPULATE = [
  { path: 'course', select: 'title slug' },
  { path: 'student', select: 'fullName email avatarUrl' },
  { path: 'lesson', select: 'title' },
  { path: 'assignment', select: 'title dueDate maxMarks' },
];

/** Asserts the caller owns the course a submission belongs to. */
const assertCourseOwner = async (courseId: string, user: AuthUser): Promise<void> => {
  if (user.roles.includes('admin')) return;
  const course = await Course.findById(courseId);
  if (!course) throw ApiError.notFound('Course not found');
  if (course.instructor.toString() !== user.id) {
    throw ApiError.forbidden('You can only manage submissions for your own courses');
  }
};

/** Requires an active or completed enrolment before work is accepted. */
const requireEnrollment = async (
  courseId: string,
  user: AuthUser,
): Promise<HydratedDocument<IEnrollment>> => {
  const enrollment = await Enrollment.findOne({
    course: courseId,
    student: user.id,
    status: { $in: ['active', 'completed'] },
  });

  if (!enrollment) throw ApiError.forbidden('Enrol in this course to submit assignments');
  return enrollment;
};

export const createSubmission = async (
  input: CreateSubmissionInput,
  user: AuthUser,
  req: Request,
): Promise<unknown> => {
  if (!user.roles.includes('student')) {
    throw ApiError.forbidden('Only students can submit assignments');
  }

  /* ---------- path 1: a first-class assignment ---------- */
  if ('assignment' in input) {
    const assignment = await Assignment.findById(input.assignment);
    if (!assignment) throw ApiError.notFound('Assignment not found');
    if (!assignment.isPublished) {
      throw ApiError.forbidden('This assignment has not been published yet');
    }

    const enrollment = await requireEnrollment(assignment.course.toString(), user);

    // Friendly duplicate guard. The unique index on { assignment, student } is
    // the real guarantee; this turns the resulting race into a 409.
    const duplicate = await Submission.findOne({
      assignment: assignment._id,
      student: user.id,
    });
    if (duplicate) throw ApiError.conflict('You have already submitted this assignment');

    const submission = await Submission.create({
      course: assignment.course,
      assignment: assignment._id,
      lesson: assignment.lesson,
      assignmentTitle: assignment.title,
      student: user.id,
      enrollment: enrollment._id,
      content: input.answerText ?? '',
      answerUrl: input.answerURL,
      attachments: input.attachments,
      // Snapshot the marking scale so a later edit cannot rewrite history.
      maxMarks: assignment.maxMarks,
      dueAt: assignment.dueDate,
    });

    await recordAudit({
      req,
      actorId: user.id,
      actorRole: user.roles[0],
      action: 'submission.create',
      entity: 'Submission',
      entityId: String(submission._id),
      meta: { assignment: String(assignment._id), course: String(assignment.course) },
    });

    return submission.populate(SUBMISSION_POPULATE);
  }

  /* ---------- path 2: an assignment-type lesson ---------- */
  const lesson = await Lesson.findOne({
    _id: input.lesson,
    course: input.course,
    isDeleted: false,
  });
  if (!lesson) throw ApiError.notFound('Lesson not found in this course');
  if (lesson.type !== 'assignment') {
    throw ApiError.badRequest('This lesson is not an assignment');
  }

  const enrollment = await requireEnrollment(input.course, user);

  const duplicate = await Submission.findOne({ student: user.id, lesson: input.lesson });
  if (duplicate) throw ApiError.conflict('You have already submitted this assignment');

  const submission = await Submission.create({
    course: input.course,
    lesson: input.lesson,
    assignmentTitle: lesson.title,
    student: user.id,
    enrollment: enrollment._id,
    content: input.content,
    attachments: input.attachments,
  });

  await recordAudit({
    req,
    actorId: user.id,
    actorRole: user.roles[0],
    action: 'submission.create',
    entity: 'Submission',
    entityId: String(submission._id),
    meta: { course: input.course, lesson: input.lesson },
  });

  return submission.populate(SUBMISSION_POPULATE);
};

export const listMySubmissions = async (
  user: AuthUser,
  query: { page?: number; limit?: number; status?: string } = {},
): Promise<PaginatedResult<unknown>> => {
  const { page, limit, skip } = parsePagination(query);

  const filter: Record<string, unknown> = { student: user.id };
  if (query.status) filter.status = query.status;

  const [items, total] = await Promise.all([
    Submission.find(filter)
      .populate(SUBMISSION_POPULATE)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Submission.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta(total, page, limit) };
};

export const listSubmissions = async (
  query: ListSubmissionsInput,
  user: AuthUser,
): Promise<PaginatedResult<unknown>> => {
  const filter: Record<string, unknown> = {};
  if (query.course) filter.course = query.course;
  if (query.student) filter.student = query.student;
  if (query.status) filter.status = query.status;

  if (query.course) {
    await assertCourseOwner(query.course, user);
  } else if (!user.roles.includes('admin')) {
    // Without a course filter, instructors only see their own courses.
    const courses = await Course.find({ instructor: user.id }).select('_id');
    filter.course = { $in: courses.map((course) => course._id) };
  }

  const { page, limit, skip } = parsePagination(query);

  const [items, total] = await Promise.all([
    Submission.find(filter)
      .populate(SUBMISSION_POPULATE)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Submission.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta(total, page, limit) };
};

export const gradeSubmission = async (
  id: string,
  input: GradeSubmissionInput,
  user: AuthUser,
  req: Request,
): Promise<unknown> => {
  const submission = await Submission.findById(id);
  if (!submission) throw ApiError.notFound('Submission not found');

  await assertCourseOwner(submission.course.toString(), user);

  // Assignment work is marked against its own scale; everything else uses the
  // 0-100 scale the validator already enforces.
  if (submission.maxMarks !== undefined && input.grade > submission.maxMarks) {
    throw ApiError.badRequest(`Grade cannot exceed the maximum of ${submission.maxMarks} marks`);
  }

  submission.grade = input.grade;
  submission.feedback = input.feedback;
  submission.status = input.status;
  submission.gradedBy = new Types.ObjectId(user.id);
  submission.gradedAt = new Date();
  await submission.save();

  const awarded =
    submission.maxMarks !== undefined
      ? `${input.grade}/${submission.maxMarks} (${gradePercentage(input.grade, submission.maxMarks)}%)`
      : `${input.grade}%`;

  await createNotification({
    user: submission.student.toString(),
    type: 'grade',
    title: 'Assignment graded',
    message: `You scored ${awarded} on "${submission.assignmentTitle}".`,
    link: '/learn/progress',
  });

  await recordAudit({
    req,
    actorId: user.id,
    actorRole: user.roles[0],
    action: 'submission.grade',
    entity: 'Submission',
    entityId: id,
    meta: { grade: input.grade },
  });

  return submission.populate(SUBMISSION_POPULATE);
};
