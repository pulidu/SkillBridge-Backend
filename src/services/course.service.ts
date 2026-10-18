import type { Request } from 'express';
import type { Types } from 'mongoose';
import { COURSE_SORT_OPTIONS, type CourseSort } from '../constants';
import { Category, Course, Enrollment, Lesson, Rating, User } from '../models';
import type { PaginatedResult } from '../types';
import type { AuthUser } from '../types';
import { ApiError } from '../utils/ApiError';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import { uniqueSlug } from '../utils/slug';
import type {
  CreateCourseInput,
  CreateRatingInput,
  ListCoursesInput,
  UpdateCourseInput,
} from '../validators/course.validator';
import { recordAudit } from './audit.service';
import { createNotification, notifyEnrolledStudents } from './notification.service';

/** Populated fields returned with a course. */
const COURSE_POPULATE = [
  { path: 'category', select: 'name slug' },
  { path: 'instructor', select: 'fullName avatarUrl' },
];

/**
 * Restricts a course query to what a role is allowed to see.
 * - admin: everything
 * - instructor: their own courses plus any published course
 * - student: published courses only
 */
const applyVisibility = (
  filter: Record<string, unknown>,
  user?: AuthUser,
): Record<string, unknown> => {
  if (!user) return { ...filter, status: 'published' };
  if (user.roles.includes('admin')) return filter;
  if (user.roles.includes('instructor')) {
    return { ...filter, $or: [{ instructor: user.id }, { status: 'published' }] };
  }
  return { ...filter, status: 'published' };
};

const buildSort = (sort: CourseSort): Record<string, 1 | -1> => {
  switch (sort) {
    case 'oldest':
      return { createdAt: 1 };
    case 'title':
      return { title: 1 };
    case 'rating':
      return { averageRating: -1, ratingCount: -1 };
    case 'popular':
      return { enrollmentCount: -1, createdAt: -1 };
    case 'duration':
      return { durationMinutes: -1 };
    case 'newest':
    default:
      return { createdAt: -1 };
  }
};

export const listCourses = async (
  input: ListCoursesInput,
  user?: AuthUser,
): Promise<PaginatedResult<unknown>> => {
  const { page, limit, skip } = parsePagination(input);

  const filter: Record<string, unknown> = { isDeleted: false };
  if (input.category) filter.category = input.category;
  if (input.level) filter.level = input.level;
  if (input.status) filter.status = input.status;
  if (input.instructor) filter.instructor = input.instructor;
  if (input.tag) filter.tags = input.tag;
  if (input.minRating !== undefined) filter.averageRating = { $gte: input.minRating };
  if (input.maxPrice !== undefined) filter.price = { $lte: input.maxPrice };
  if (input.search) {
    const safe = input.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { title: { $regex: safe, $options: 'i' } },
      { shortDescription: { $regex: safe, $options: 'i' } },
      { tags: { $regex: safe, $options: 'i' } },
    ];
  }

  const visible = applyVisibility(filter, user);

  const [courses, total] = await Promise.all([
    Course.find(visible)
      .populate(COURSE_POPULATE)
      .sort(buildSort(input.sort ?? 'newest'))
      .skip(skip)
      .limit(limit),
    Course.countDocuments(visible),
  ]);

  return { items: courses, meta: buildPaginationMeta(total, page, limit) };
};

/** Highest rated published courses, used on the landing page. */
export const listFeaturedCourses = async (limit = 6): Promise<unknown[]> =>
  Course.find({ isDeleted: false, status: 'published' })
    .populate(COURSE_POPULATE)
    .sort({ averageRating: -1, enrollmentCount: -1 })
    .limit(limit);

export const getCourseById = async (id: string, user?: AuthUser): Promise<unknown> => {
  const course = await Course.findById(id).populate(COURSE_POPULATE);
  if (!course || course.isDeleted) throw ApiError.notFound('Course not found');

  const visible = applyVisibility({ _id: course._id }, user);
  const permitted = await Course.exists(visible);
  if (!permitted) throw ApiError.notFound('Course not found');

  return course;
};

export const getCourseBySlug = async (slug: string, user?: AuthUser): Promise<unknown> => {
  const course = await Course.findOne({ slug, isDeleted: false }).populate(COURSE_POPULATE);
  if (!course) throw ApiError.notFound('Course not found');

  const permitted = await Course.exists(applyVisibility({ _id: course._id }, user));
  if (!permitted) throw ApiError.notFound('Course not found');

  return course;
};

/**
 * Resolves the owning instructor for a course.
 *
 * An instructor always owns what they create, so a mismatch is only tolerated
 * for an admin. The target must be an existing, undeleted account that can
 * actually teach, which is what stops a course being parked on a student.
 */
const resolveInstructorId = async (
  requested: string | undefined,
  actor: AuthUser,
): Promise<string> => {
  if (!requested || requested === actor.id) {
    if (requested && requested === actor.id) return actor.id;
    if (!actor.roles.includes('instructor') && !actor.roles.includes('admin')) {
      throw ApiError.forbidden('Only instructors can own a course');
    }
    return actor.id;
  }

  if (!actor.roles.includes('admin')) {
    throw ApiError.forbidden('You can only create courses under your own account');
  }

  const owner = await User.findOne({ _id: requested, isDeleted: false });
  if (!owner) throw ApiError.notFound('Instructor not found');
  if (!owner.roles.includes('instructor') && !owner.roles.includes('admin')) {
    throw ApiError.badRequest('Courses can only be assigned to instructors');
  }

  return String(owner._id);
};

export const createCourse = async (
  input: CreateCourseInput,
  user: AuthUser,
  req: Request,
): Promise<unknown> => {
  const category = await Category.findById(input.category);
  if (!category) throw ApiError.notFound('Category not found');

  const instructorId = await resolveInstructorId(input.instructor, user);

  const slug = await uniqueSlug(input.title, async (candidate) =>
    Boolean(await Course.exists({ slug: candidate })),
  );

  const course = await Course.create({
    ...input,
    slug,
    instructor: instructorId,
    shortDescription: input.shortDescription ?? input.description.slice(0, 180),
  });

  await recordAudit({
    req,
    actorId: user.id,
    actorRole: user.roles[0],
    action: 'course.create',
    entity: 'Course',
    entityId: String(course._id),
    meta: { title: course.title },
  });

  return course.populate(COURSE_POPULATE);
};

/**
 * Reassigns (or assigns) the instructor responsible for a course.
 *
 * Admin only, enforced by `authorize('admin')` on the route. Separated from
 * `updateCourse` because changing ownership is an administrative act with its
 * own audit trail, not an ordinary content edit.
 */
export const assignCourseInstructor = async (
  id: string,
  instructorId: string,
  user: AuthUser,
  req: Request,
): Promise<unknown> => {
  const course = await Course.findById(id);
  if (!course || course.isDeleted) throw ApiError.notFound('Course not found');

  const owner = await User.findOne({ _id: instructorId, isDeleted: false });
  if (!owner) throw ApiError.notFound('Instructor not found');
  if (!owner.roles.includes('instructor') && !owner.roles.includes('admin')) {
    throw ApiError.badRequest('Courses can only be assigned to instructors');
  }
  if (owner.status !== 'active') {
    throw ApiError.badRequest('That instructor account is suspended');
  }

  const previous = course.instructor;
  course.instructor = owner._id;
  await course.save();

  await recordAudit({
    req,
    actorId: user.id,
    actorRole: user.roles[0],
    action: 'course.assign_instructor',
    entity: 'Course',
    entityId: id,
    meta: { from: String(previous), to: String(owner._id) },
  });

  return course.populate(COURSE_POPULATE);
};

export const updateCourse = async (
  id: string,
  input: UpdateCourseInput,
  user: AuthUser,
  req: Request,
): Promise<unknown> => {
  const course = await Course.findById(id);
  if (!course || course.isDeleted) throw ApiError.notFound('Course not found');

  assertCourseOwnership(course, user);

  if (input.category) {
    const category = await Category.findById(input.category);
    if (!category) throw ApiError.notFound('Category not found');
  }

  const update: Record<string, unknown> = { ...input };

  // Ownership is an administrative act with its own route and audit trail, so
  // it is stripped here rather than silently applied through a content edit.
  if (input.instructor !== undefined) {
    delete update.instructor;
    throw ApiError.badRequest(
      'Use the assign instructor endpoint to change a course instructor',
    );
  }

  if (input.title && input.title !== course.title) {
    update.slug = await uniqueSlug(input.title, async (candidate) =>
      Boolean(await Course.exists({ slug: candidate, _id: { $ne: id } })),
    );
  }

  const updated = await Course.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
  if (!updated) throw ApiError.notFound('Course not found');

  await recordAudit({
    req,
    actorId: user.id,
    actorRole: user.roles[0],
    action: 'course.update',
    entity: 'Course',
    entityId: id,
    meta: { fields: Object.keys(input) },
  });

  return updated.populate(COURSE_POPULATE);
};

/**
 * Soft delete, then recompute the denormalised lesson counters.
 *
 * Safeguard: a course that still has learners is not silently removed. The
 * admin must unpublish it, or archive it, so the roster keeps working and a
 * student mid-course is not left pointing at nothing. Only a course with no
 * live enrolments can be deleted outright.
 */
export const deleteCourse = async (id: string, user: AuthUser, req: Request): Promise<void> => {
  const course = await Course.findById(id);
  if (!course || course.isDeleted) throw ApiError.notFound('Course not found');

  assertCourseOwnership(course, user);

  const liveEnrollments = await Enrollment.countDocuments({
    course: id,
    status: { $ne: 'cancelled' },
  });

  if (liveEnrollments > 0) {
    throw ApiError.conflict(
      `This course still has ${liveEnrollments} active or completed enrollment${
        liveEnrollments === 1 ? '' : 's'
      }. Unpublish or archive it instead of deleting.`,
    );
  }

  course.isDeleted = true;
  if (course.status !== 'archived') course.status = 'archived';
  await course.save();

  await recalculateCourseStats(id);

  await recordAudit({
    req,
    actorId: user.id,
    actorRole: user.roles[0],
    action: 'course.delete',
    entity: 'Course',
    entityId: id,
    meta: { title: course.title },
  });
};

/** Transitions a course between draft, published and archived. */
export const setCourseStatus = async (
  id: string,
  status: 'draft' | 'published' | 'archived',
  user: AuthUser,
  req: Request,
): Promise<unknown> => {
  const course = await Course.findById(id);
  if (!course || course.isDeleted) throw ApiError.notFound('Course not found');

  assertCourseOwnership(course, user);

  if (status === 'published') {
    const lessonCount = await Lesson.countDocuments({ course: id, isDeleted: false });
    if (lessonCount === 0) {
      throw ApiError.badRequest('Add at least one lesson before publishing');
    }
  }

  course.status = status;
  if (status === 'published' && !course.publishedAt) course.publishedAt = new Date();
  await course.save();

  await recordAudit({
    req,
    actorId: user.id,
    actorRole: user.roles[0],
    action: `course.${status}`,
    entity: 'Course',
    entityId: id,
  });

  if (status === 'published') {
    await notifyEnrolledStudents(id, {
      type: 'course_update',
      title: 'Course published',
      message: `"${course.title}" is now live.`,
      link: `/courses/${course.slug}`,
    }).catch(() => undefined);
  }

  return course.populate(COURSE_POPULATE);
};

/** Enrolment and completion statistics for one course. */
export const getCourseAnalytics = async (id: string, user: AuthUser): Promise<unknown> => {
  const course = await Course.findById(id);
  if (!course || course.isDeleted) throw ApiError.notFound('Course not found');

  assertCourseOwnership(course, user);

  const [statusBreakdown, completion, total] = await Promise.all([
    Enrollment.aggregate([
      { $match: { course: course._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Enrollment.aggregate([
      { $match: { course: course._id } },
      { $group: { _id: null, averageProgress: { $avg: '$progress' } } },
    ]),
    Enrollment.countDocuments({ course: course._id }),
  ]);

  return {
    courseId: String(course._id),
    enrollmentCount: total,
    ratingAverage: course.averageRating,
    ratingCount: course.ratingCount,
    averageProgress: completion[0]?.averageProgress ? Math.round(completion[0].averageProgress) : 0,
    byStatus: statusBreakdown.map((entry) => ({ status: entry._id, count: entry.count })),
  };
};

/** Creates or updates the caller's rating and recomputes the course average. */
export const rateCourse = async (
  id: string,
  input: CreateRatingInput,
  user: AuthUser,
): Promise<unknown> => {
  const course = await Course.findById(id);
  if (!course || course.isDeleted) throw ApiError.notFound('Course not found');
  if (course.instructor.toString() === user.id) {
    throw ApiError.badRequest('You cannot review your own course');
  }

  await Rating.findOneAndUpdate(
    { course: course._id, user: user.id },
    { value: input.value, review: input.review },
    { new: true, upsert: true, runValidators: true },
  );

  await recalculateCourseRatings(id);
  await createNotification({
    user: course.instructor,
    type: 'system',
    title: 'New course review',
    message: `${user.fullName} rated "${course.title}" ${input.value}/5.`,
    link: `/instructor/courses/${course._id}/students`,
  });

  return Course.findById(id).select('averageRating ratingCount');
};

export const listCourseRatings = async (
  id: string,
  page: number,
  limit: number,
): Promise<PaginatedResult<unknown>> => {
  const { skip } = parsePagination({ page, limit });

  const [items, total] = await Promise.all([
    Rating.find({ course: id })
      .populate('user', 'fullName avatarUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Rating.countDocuments({ course: id }),
  ]);

  return { items, meta: buildPaginationMeta(total, page, limit) };
};

/** Students enrolled in a course, with progress, for the instructor roster. */
export const listCourseStudents = async (
  id: string,
  user: AuthUser,
  query: { page?: number; limit?: number; status?: string; search?: string },
): Promise<PaginatedResult<unknown>> => {
  const course = await Course.findById(id);
  if (!course || course.isDeleted) throw ApiError.notFound('Course not found');

  assertCourseOwnership(course, user);

  const { page, limit, skip } = parsePagination(query);

  const filter: Record<string, unknown> = { course: course._id };
  if (query.status) filter.status = query.status;

  let roster = Enrollment.find(filter)
    .populate('student', 'fullName email avatarUrl')
    .sort({ lastAccessedAt: -1 });

  if (query.search) {
    const matching = await User.find({
      _id: { $in: (await Enrollment.find(filter).select('student').lean()).map((e) => e.student) },
      $or: [
        { fullName: { $regex: query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
        { email: { $regex: query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
      ],
    }).select('_id');

    roster = Enrollment.find({ ...filter, student: { $in: matching.map((u) => u._id) } })
      .populate('student', 'fullName email avatarUrl')
      .sort({ lastAccessedAt: -1 });
  }

  const [items, total] = await Promise.all([
    roster.skip(skip).limit(limit),
    Enrollment.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta(total, page, limit) };
};

/* -------------------------------------------------------------------------- */
/* Ownership + denormalisation helpers                                         */
/* -------------------------------------------------------------------------- */

/**
 * Throws 403 unless the caller is an admin or the course's instructor.
 * This is the object-level access check that `authorize` cannot do.
 */
export const assertCourseOwnership = (
  course: { instructor: { toString(): string } },
  user: AuthUser,
): void => {
  if (user.roles.includes('admin')) return;
  if (course.instructor.toString() === user.id) return;
  throw ApiError.forbidden('You can only manage your own courses');
};

/** Recomputes totalLessons / durationMinutes from the lessons collection. */
export const recalculateCourseStats = async (courseId: string | Types.ObjectId): Promise<void> => {
  const [summary] = await Lesson.aggregate([
    { $match: { course: courseId, isDeleted: false, isPublished: true } },
    {
      $group: {
        _id: null,
        totalLessons: { $sum: 1 },
        durationMinutes: { $sum: '$durationMinutes' },
      },
    },
  ]);

  await Course.findByIdAndUpdate(courseId, {
    $set: {
      totalLessons: summary?.totalLessons ?? 0,
      durationMinutes: summary?.durationMinutes ?? 0,
    },
  });
};

/** Recomputes averageRating / ratingCount from the ratings collection. */
export const recalculateCourseRatings = async (
  courseId: string | Types.ObjectId,
): Promise<void> => {
  const [summary] = await Rating.aggregate([
    { $match: { course: courseId } },
    { $group: { _id: null, average: { $avg: '$value' }, count: { $sum: 1 } } },
  ]);

  await Course.findByIdAndUpdate(courseId, {
    $set: {
      averageRating: summary ? Math.round(summary.average * 10) / 10 : 0,
      ratingCount: summary?.count ?? 0,
    },
  });
};

export const listCategoriesWithCounts = async (): Promise<unknown[]> => {  const categories = await Category.find({ isActive: true, isDeleted: false }).sort({ name: 1 });
  const counts = await Course.aggregate([
    { $match: { status: 'published', isDeleted: false } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);

  const countMap = new Map(counts.map((entry) => [String(entry._id), entry.count]));

  return categories.map((category) => ({
    ...category.toJSON(),
    courseCount: countMap.get(String(category._id)) ?? 0,
  }));
};

export const availableSortOptions = (): readonly CourseSort[] => COURSE_SORT_OPTIONS;
