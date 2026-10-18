import { Types } from 'mongoose';
import type { Request } from 'express';
import {
  Certificate,
  Course,
  Enrollment,
  Lesson,
  User,
  buildSerialNumber,
  calculateProgress,
} from '../models';
import type { AuthUser, PaginatedResult } from '../types';
import { ApiError } from '../utils/ApiError';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import type {
  CreateEnrollmentInput,
  ListEnrollmentsInput,
  UpdateEnrollmentInput,
} from '../validators/enrollment.validator';
import { recordAudit } from './audit.service';
import { createNotification } from './notification.service';

const ENROLLMENT_POPULATE = [
  { path: 'course', select: 'title slug shortDescription thumbnailUrl level totalLessons durationMinutes instructor status' },
  { path: 'course.instructor', select: 'fullName avatarUrl' },
  { path: 'student', select: 'fullName email avatarUrl' },
];

/* -------------------------------------------------------------------------- */
/* Enrolment                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Enrols a student in a published course.
 *
 * A student may only enrol themselves; an admin can enrol any student.
 */
export const createEnrollment = async (
  input: CreateEnrollmentInput,
  user: AuthUser,
  req: Request,
): Promise<unknown> => {
  const isAdmin = user.roles.includes('admin');

  if (input.student && input.student !== user.id && !isAdmin) {
    throw ApiError.forbidden('You can only enrol yourself');
  }
  if (!isAdmin && !user.roles.includes('student')) {
    throw ApiError.forbidden('Only students can enrol in courses');
  }

  const course = await Course.findOne({ _id: input.course, isDeleted: false });
  if (!course) throw ApiError.notFound('Course not found');

  if (course.status !== 'published') throw ApiError.badRequest('This course is not open for enrolment');

  const studentId = isAdmin && input.student ? input.student : user.id;

  if (course.instructor.toString() === studentId) {
    throw ApiError.badRequest('You cannot enrol in your own course');
  }

  const student = await User.findOne({ _id: studentId, isDeleted: false, status: 'active' });
  if (!student) throw ApiError.notFound('Student not found');

  const existing = await Enrollment.findOne({ course: course._id, student: studentId });
  if (existing) {
    if (existing.status === 'cancelled') {
      existing.status = 'active';
      existing.lastAccessedAt = new Date();
      await existing.save();
      return existing.populate(ENROLLMENT_POPULATE);
    }
    throw ApiError.conflict('You are already enrolled in this course');
  }

  const enrollment = await Enrollment.create({
    course: course._id,
    student: studentId,
    status: 'active',
  });

  await Course.findByIdAndUpdate(course._id, { $inc: { enrollmentCount: 1 } });

  await createNotification({
    user: course.instructor,
    type: 'enrollment',
    title: 'New enrolment',
    message: `${student.fullName} enrolled in "${course.title}".`,
    link: `/instructor/courses/${course._id}/students`,
  });

  await recordAudit({
    req,
    actorId: user.id,
    actorRole: user.roles[0],
    action: 'enrollment.create',
    entity: 'Enrollment',
    entityId: String(enrollment._id),
    meta: { course: String(course._id), student: studentId },
  });

  return enrollment.populate(ENROLLMENT_POPULATE);
};

export const listMyEnrollments = async (
  user: AuthUser,
  query: { page?: number; limit?: number; status?: string } = {},
): Promise<PaginatedResult<unknown>> => {
  const { page, limit, skip } = parsePagination(query);

  const filter: Record<string, unknown> = { student: user.id };
  if (query.status) filter.status = query.status;

  const [items, total] = await Promise.all([
    Enrollment.find(filter)
      .populate(ENROLLMENT_POPULATE)
      .sort({ lastAccessedAt: -1 })
      .skip(skip)
      .limit(limit),
    Enrollment.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta(total, page, limit) };
};

export const listEnrollments = async (
  query: ListEnrollmentsInput,
  _user: AuthUser,
): Promise<PaginatedResult<unknown>> => {
  const { page, limit, skip } = parsePagination(query);

  const filter: Record<string, unknown> = {};
  if (query.course) filter.course = query.course;
  if (query.student) filter.student = query.student;
  if (query.status) filter.status = query.status;

  const [items, total] = await Promise.all([
    Enrollment.find(filter)
      .populate(ENROLLMENT_POPULATE)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Enrollment.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta(total, page, limit) };
};

export const getEnrollmentById = async (id: string, user: AuthUser): Promise<unknown> => {
  const enrollment = await Enrollment.findById(id).populate(ENROLLMENT_POPULATE);
  if (!enrollment) throw ApiError.notFound('Enrollment not found');

  const isOwner = enrollment.student.toString() === user.id;
  if (!isOwner && !user.roles.includes('admin')) {
    const course = enrollment.course as unknown as { instructor: { toString(): string } };
    if (course.instructor.toString() !== user.id) {
      throw ApiError.forbidden('You do not have access to this enrollment');
    }
  }

  return enrollment;
};

export const updateEnrollment = async (
  id: string,
  input: UpdateEnrollmentInput,
  user: AuthUser,
  req: Request,
): Promise<unknown> => {
  const enrollment = await Enrollment.findById(id);
  if (!enrollment) throw ApiError.notFound('Enrollment not found');

  if (!user.roles.includes('admin')) {
    const course = await Course.findById(enrollment.course);
    if (!course || course.instructor.toString() !== user.id) {
      throw ApiError.forbidden('You can only manage enrolments for your own courses');
    }
  }

  Object.assign(enrollment, input);
  await enrollment.save();

  await recordAudit({
    req,
    actorId: user.id,
    actorRole: user.roles[0],
    action: 'enrollment.update',
    entity: 'Enrollment',
    entityId: id,
    meta: { fields: Object.keys(input) },
  });

  return enrollment.populate(ENROLLMENT_POPULATE);
};

export const cancelEnrollment = async (id: string, user: AuthUser, req: Request): Promise<void> => {
  const enrollment = await Enrollment.findById(id);
  if (!enrollment) throw ApiError.notFound('Enrollment not found');

  const isOwner = enrollment.student.toString() === user.id;
  if (!isOwner && !user.roles.includes('admin')) {
    const course = await Course.findById(enrollment.course);
    if (!course || course.instructor.toString() !== user.id) {
      throw ApiError.forbidden('You can only cancel enrolments for your own courses');
    }
  }

  if (enrollment.status === 'completed') {
    throw ApiError.badRequest('A completed enrollment cannot be cancelled');
  }

  enrollment.status = 'cancelled';
  enrollment.lastAccessedAt = new Date();
  await enrollment.save();

  await Course.findByIdAndUpdate(enrollment.course, { $inc: { enrollmentCount: -1 } });

  await recordAudit({
    req,
    actorId: user.id,
    actorRole: user.roles[0],
    action: 'enrollment.cancel',
    entity: 'Enrollment',
    entityId: id,
  });
};

/* -------------------------------------------------------------------------- */
/* Progress                                                                    */
/* -------------------------------------------------------------------------- */

export const getMyProgress = async (user: AuthUser): Promise<unknown[]> =>
  Enrollment.find({ student: user.id, status: { $ne: 'cancelled' } })
    .populate(ENROLLMENT_POPULATE)
    .sort({ lastAccessedAt: -1 });

/** Marks a lesson complete, recomputes progress and issues a certificate. */
export const completeLesson = async (
  lessonId: string,
  user: AuthUser,
): Promise<unknown> => {
  const lesson = await Lesson.findOne({ _id: lessonId, isDeleted: false, isPublished: true });
  if (!lesson) throw ApiError.notFound('Lesson not found');

  const enrollment = await Enrollment.findOne({
    course: lesson.course,
    student: user.id,
    status: { $in: ['active', 'completed'] },
  });
  if (!enrollment) throw ApiError.forbidden('Enrol in this course to track progress');

  if (!enrollment.completedLessons.some((id) => id.toString() === lessonId)) {
    enrollment.completedLessons.push(lesson._id);
  }

  enrollment.timeSpentMinutes += lesson.durationMinutes || 0;
  enrollment.lastAccessedAt = new Date();

  const totalLessons = await Lesson.countDocuments({
    course: lesson.course,
    isDeleted: false,
    isPublished: true,
  });

  enrollment.progress = calculateProgress(enrollment.completedLessons.length, totalLessons);

  if (enrollment.progress >= 100 && enrollment.status !== 'completed') {
    enrollment.status = 'completed';
    enrollment.completedAt = new Date();
  }

  await enrollment.save();

  const certificate =
    enrollment.status === 'completed'
      ? await issueCertificate(enrollment._id.toString(), user.id)
      : null;

  return { enrollment, certificate };
};

/** Undoes a completion, recomputing progress downwards. */
export const uncompleteLesson = async (
  lessonId: string,
  user: AuthUser,
): Promise<unknown> => {
  const lesson = await Lesson.findOne({ _id: lessonId, isDeleted: false });
  if (!lesson) throw ApiError.notFound('Lesson not found');

  const enrollment = await Enrollment.findOne({
    course: lesson.course,
    student: user.id,
    status: { $in: ['active', 'completed'] },
  });
  if (!enrollment) throw ApiError.forbidden('Enrollment not found');

  enrollment.completedLessons = enrollment.completedLessons.filter(
    (id) => id.toString() !== lessonId,
  );

  const totalLessons = await Lesson.countDocuments({
    course: lesson.course,
    isDeleted: false,
    isPublished: true,
  });

  enrollment.progress = calculateProgress(enrollment.completedLessons.length, totalLessons);
  if (enrollment.status === 'completed' && enrollment.progress < 100) {
    enrollment.status = 'active';
    enrollment.completedAt = undefined;
  }

  await enrollment.save();

  return enrollment;
};

export const getEnrollmentProgress = async (
  enrollmentId: string,
  user: AuthUser,
): Promise<unknown> => {
  const enrollment = await Enrollment.findById(enrollmentId).populate(ENROLLMENT_POPULATE);
  if (!enrollment) throw ApiError.notFound('Enrollment not found');

  const isOwner = enrollment.student.toString() === user.id;
  if (!isOwner && !user.roles.includes('admin')) {
    throw ApiError.forbidden('You do not have access to this enrollment');
  }

  const lessons = await Lesson.find({
    course: enrollment.course,
    isDeleted: false,
    isPublished: true,
  })
    .select('title position type durationMinutes module')
    .sort({ position: 1, createdAt: 1 });

  const completed = new Set(enrollment.completedLessons.map((id) => id.toString()));

  return {
    enrollment,
    lessons: lessons.map((lesson) => ({
      ...lesson.toJSON(),
      isCompleted: completed.has(String(lesson._id)),
    })),
  };
};

/* -------------------------------------------------------------------------- */
/* Certificates                                                                */
/* -------------------------------------------------------------------------- */

/** Issues a certificate for a completed enrolment (idempotent). */
export const issueCertificate = async (
  enrollmentId: string,
  studentId: string,
): Promise<unknown | null> => {
  const enrollment = await Enrollment.findById(enrollmentId);
  if (!enrollment || enrollment.status !== 'completed') return null;

  const existing = await Certificate.findOne({
    enrollment: enrollment._id,
    student: studentId,
  });
  if (existing) return existing;

  const count = await Certificate.countDocuments();
  const salt = String(studentId).slice(-4);
  const serialNumber = buildSerialNumber(count + 1, salt);

  const certificate = await Certificate.create({
    serialNumber,
    course: enrollment.course,
    student: studentId,
    enrollment: enrollment._id,
    finalScore: enrollment.finalScore,
  });

  const course = await Course.findById(enrollment.course).select('title slug');
  if (course) {
    await createNotification({
      user: studentId,
      type: 'announcement',
      title: 'Certificate issued',
      message: `You completed "${course.title}". Your certificate is ready.`,
      link: '/learn/certificates',
    });
  }

  return certificate;
};

export const listMyCertificates = async (user: AuthUser): Promise<unknown[]> =>
  Certificate.find({ student: user.id, revokedAt: { $exists: false } })
    .populate('course', 'title slug thumbnailUrl')
    .sort({ issuedAt: -1 });

/** Public verification by serial number. */
export const verifyCertificate = async (serialNumber: string): Promise<unknown> => {
  const certificate = await Certificate.findOne({ serialNumber: serialNumber.toUpperCase() })
    .populate('course', 'title slug')
    .populate('student', 'fullName');

  if (!certificate) throw ApiError.notFound('No certificate found with that serial number');
  return certificate;
};

export const revokeCertificate = async (id: string, user: AuthUser): Promise<unknown> => {
  const certificate = await Certificate.findById(id);
  if (!certificate) throw ApiError.notFound('Certificate not found');

  certificate.revokedAt = new Date();
  certificate.revokedBy = new Types.ObjectId(user.id);
  await certificate.save();

  return certificate;
};
