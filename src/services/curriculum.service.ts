import type { Request } from 'express';
import { Category, CourseModule, Course, Lesson, toUserResponse, User } from '../models';
import type { AuthUser } from '../types';
import { ApiError } from '../utils/ApiError';
import { uniqueSlug } from '../utils/slug';
import type {
  CreateCategoryInput,
  CreateLessonInput,
  CreateModuleInput,
  UpdateCategoryInput,
  UpdateLessonInput,
  UpdateModuleInput,
} from '../validators/curriculum.validator';
import { recordAudit } from './audit.service';
import { assertCourseOwnership, recalculateCourseStats } from './course.service';

/* -------------------------------------------------------------------------- */
/* Categories                                                                  */
/* -------------------------------------------------------------------------- */

export const listCategories = async (): Promise<unknown[]> =>
  Category.find({ isActive: true, isDeleted: false }).sort({ name: 1 });

export const getCategory = async (id: string): Promise<unknown> => {
  const category = await Category.findById(id);
  if (!category || category.isDeleted) throw ApiError.notFound('Category not found');
  return category;
};

export const getCategoryBySlug = async (slug: string): Promise<unknown> => {
  const category = await Category.findOne({ slug, isDeleted: false });
  if (!category) throw ApiError.notFound('Category not found');
  return category;
};

export const createCategory = async (
  input: CreateCategoryInput,
  req: Request,
): Promise<unknown> => {
  const duplicate = await Category.findOne({ name: input.name });
  if (duplicate) throw ApiError.conflict('A category with that name already exists');

  const slug = await uniqueSlug(input.slug ?? input.name, async (candidate) =>
    Boolean(await Category.exists({ slug: candidate })),
  );

  const category = await Category.create({ ...input, slug });

  await recordAudit({
    req,
    actorId: req.user?.id,
    actorRole: req.user?.roles[0],
    action: 'category.create',
    entity: 'Category',
    entityId: String(category._id),
  });

  return category;
};

export const updateCategory = async (
  id: string,
  input: UpdateCategoryInput,
  req: Request,
): Promise<unknown> => {
  const update: Record<string, unknown> = { ...input };

  if (input.name) {
    const duplicate = await Category.findOne({ name: input.name, _id: { $ne: id } });
    if (duplicate) throw ApiError.conflict('A category with that name already exists');
    update.slug = await uniqueSlug(input.name, async (candidate) =>
      Boolean(await Category.exists({ slug: candidate, _id: { $ne: id } })),
    );
  }

  const category = await Category.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
  if (!category) throw ApiError.notFound('Category not found');

  await recordAudit({
    req,
    actorId: req.user?.id,
    actorRole: req.user?.roles[0],
    action: 'category.update',
    entity: 'Category',
    entityId: id,
  });

  return category;
};

export const deleteCategory = async (id: string, req: Request): Promise<void> => {
  const category = await Category.findById(id);
  if (!category || category.isDeleted) throw ApiError.notFound('Category not found');

  const inUse = await Course.countDocuments({ category: id, isDeleted: false });
  if (inUse > 0) {
    throw ApiError.badRequest(`Cannot delete a category that still has ${inUse} course(s)`);
  }

  category.isDeleted = true;
  category.isActive = false;
  await category.save();

  await recordAudit({
    req,
    actorId: req.user?.id,
    actorRole: req.user?.roles[0],
    action: 'category.delete',
    entity: 'Category',
    entityId: id,
  });
};

/* -------------------------------------------------------------------------- */
/* Modules                                                                     */
/* -------------------------------------------------------------------------- */

export const listModules = async (courseId: string, user: AuthUser): Promise<unknown[]> => {
  const course = await Course.findById(courseId);
  if (!course || course.isDeleted) throw ApiError.notFound('Course not found');

  assertCourseReadAccess(course, user);

  const modules = await CourseModule.find({ course: courseId, isDeleted: false }).sort({
    position: 1,
    createdAt: 1,
  });

  const lessonCounts = await Lesson.aggregate([
    { $match: { course: courseId, isDeleted: false } },
    { $group: { _id: '$module', count: { $sum: 1 } } },
  ]);

  const countMap = new Map(
    lessonCounts.map((entry) => [String(entry._id), entry.count] as const),
  );

  return modules.map((module) => ({
    ...module.toJSON(),
    lessonCount: countMap.get(String(module._id)) ?? 0,
  }));
};

export const createModule = async (
  courseId: string,
  input: CreateModuleInput,
  user: AuthUser,
  req: Request,
): Promise<unknown> => {
  const course = await Course.findById(courseId);
  if (!course || course.isDeleted) throw ApiError.notFound('Course not found');

  assertCourseOwnership(course, user);

  const position =
    input.position ??
    ((await CourseModule.countDocuments({ course: courseId, isDeleted: false })) + 1);

  const module = await CourseModule.create({ ...input, course: courseId, position });

  await recordAudit({
    req,
    actorId: user.id,
    actorRole: user.roles[0],
    action: 'module.create',
    entity: 'Module',
    entityId: String(module._id),
    meta: { course: courseId },
  });

  return module;
};

export const updateModule = async (
  courseId: string,
  moduleId: string,
  input: UpdateModuleInput,
  user: AuthUser,
  req: Request,
): Promise<unknown> => {
  const module = await CourseModule.findOne({ _id: moduleId, course: courseId, isDeleted: false });
  if (!module) throw ApiError.notFound('Module not found');

  const course = await Course.findById(courseId);
  if (!course) throw ApiError.notFound('Course not found');

  assertCourseOwnership(course, user);

  Object.assign(module, input);
  await module.save();

  await recordAudit({
    req,
    actorId: user.id,
    actorRole: user.roles[0],
    action: 'module.update',
    entity: 'Module',
    entityId: moduleId,
  });

  return module;
};

export const deleteModule = async (
  courseId: string,
  moduleId: string,
  user: AuthUser,
  req: Request,
): Promise<void> => {
  const module = await CourseModule.findOne({ _id: moduleId, course: courseId, isDeleted: false });
  if (!module) throw ApiError.notFound('Module not found');

  const course = await Course.findById(courseId);
  if (!course) throw ApiError.notFound('Course not found');

  assertCourseOwnership(course, user);

  await CourseModule.findByIdAndUpdate(moduleId, { $set: { isDeleted: true } });
  await Lesson.updateMany(
    { course: courseId, module: moduleId },
    { $set: { isDeleted: true } },
  );

  await recalculateCourseStats(courseId);

  await recordAudit({
    req,
    actorId: user.id,
    actorRole: user.roles[0],
    action: 'module.delete',
    entity: 'Module',
    entityId: moduleId,
    meta: { course: courseId },
  });
};

/* -------------------------------------------------------------------------- */
/* Lessons                                                                     */
/* -------------------------------------------------------------------------- */

export const listLessons = async (
  courseId: string,
  user: AuthUser,
  includeUnpublished = false,
): Promise<unknown[]> => {
  const course = await Course.findById(courseId);
  if (!course || course.isDeleted) throw ApiError.notFound('Course not found');

  const isOwner =
    user.roles.includes('admin') || course.instructor.toString() === user.id;

  if (!isOwner) assertCourseReadAccess(course, user);

  const filter: Record<string, unknown> = { course: courseId, isDeleted: false };
  if (!isOwner || !includeUnpublished) filter.isPublished = true;

  return Lesson.find(filter).sort({ position: 1, createdAt: 1 });
};

export const getLesson = async (
  courseId: string,
  lessonId: string,
  user: AuthUser,
): Promise<unknown> => {
  const course = await Course.findById(courseId);
  if (!course || course.isDeleted) throw ApiError.notFound('Course not found');

  const lesson = await Lesson.findOne({ _id: lessonId, course: courseId, isDeleted: false });
  if (!lesson) throw ApiError.notFound('Lesson not found');

  const isOwner = user.roles.includes('admin') || course.instructor.toString() === user.id;
  if (isOwner) return lesson;

  // Everyone else must be enrolled, unless the lesson is a free preview.
  if (!lesson.isPublished && !lesson.isPreview) {
    throw ApiError.forbidden('This lesson is not available');
  }
  if (course.status !== 'published' && !lesson.isPreview) {
    throw ApiError.forbidden('This course is not published');
  }

  const { Enrollment } = await import('../models');
  const enrolled = await Enrollment.exists({
    course: courseId,
    student: user.id,
    status: { $in: ['active', 'completed'] },
  });

  if (!enrolled && !lesson.isPreview) {
    throw ApiError.forbidden('Enrol in this course to view the lesson');
  }

  return lesson;
};

export const createLesson = async (
  courseId: string,
  input: CreateLessonInput,
  user: AuthUser,
  req: Request,
): Promise<unknown> => {
  const course = await Course.findById(courseId);
  if (!course || course.isDeleted) throw ApiError.notFound('Course not found');

  assertCourseOwnership(course, user);

  if (input.module) {
    const parent = await CourseModule.findOne({ _id: input.module, course: courseId, isDeleted: false });
    if (!parent) throw ApiError.notFound('Module not found in this course');
  }

  const position =
    input.position ??
    ((await Lesson.countDocuments({ course: courseId, isDeleted: false })) + 1);

  const lesson = await Lesson.create({ ...input, course: courseId, position });

  await recalculateCourseStats(courseId);

  await recordAudit({
    req,
    actorId: user.id,
    actorRole: user.roles[0],
    action: 'lesson.create',
    entity: 'Lesson',
    entityId: String(lesson._id),
    meta: { course: courseId, title: lesson.title },
  });

  return lesson;
};

export const updateLesson = async (
  courseId: string,
  lessonId: string,
  input: UpdateLessonInput,
  user: AuthUser,
  req: Request,
): Promise<unknown> => {
  const lesson = await Lesson.findOne({ _id: lessonId, course: courseId, isDeleted: false });
  if (!lesson) throw ApiError.notFound('Lesson not found');

  const course = await Course.findById(courseId);
  if (!course) throw ApiError.notFound('Course not found');

  assertCourseOwnership(course, user);

  if (input.module) {
    const parent = await CourseModule.findOne({ _id: input.module, course: courseId, isDeleted: false });
    if (!parent) throw ApiError.notFound('Module not found in this course');
  }

  Object.assign(lesson, input);
  await lesson.save();
  await recalculateCourseStats(courseId);

  await recordAudit({
    req,
    actorId: user.id,
    actorRole: user.roles[0],
    action: 'lesson.update',
    entity: 'Lesson',
    entityId: lessonId,
    meta: { fields: Object.keys(input) },
  });

  return lesson;
};

export const deleteLesson = async (
  courseId: string,
  lessonId: string,
  user: AuthUser,
  req: Request,
): Promise<void> => {
  const lesson = await Lesson.findOne({ _id: lessonId, course: courseId, isDeleted: false });
  if (!lesson) throw ApiError.notFound('Lesson not found');

  const course = await Course.findById(courseId);
  if (!course) throw ApiError.notFound('Course not found');

  assertCourseOwnership(course, user);

  await Lesson.findByIdAndUpdate(lessonId, { $set: { isDeleted: true } });
  await recalculateCourseStats(courseId);

  await recordAudit({
    req,
    actorId: user.id,
    actorRole: user.roles[0],
    action: 'lesson.delete',
    entity: 'Lesson',
    entityId: lessonId,
  });
};

/** Nested module + lesson tree used by the course detail page. */
export const getCurriculum = async (
  courseId: string,
  user: AuthUser,
): Promise<{ modules: unknown[]; lessons: unknown[] }> => {
  const course = await Course.findById(courseId);
  if (!course || course.isDeleted) throw ApiError.notFound('Course not found');

  const isOwner = user.roles.includes('admin') || course.instructor.toString() === user.id;

  if (!isOwner) assertCourseReadAccess(course, user);

  const moduleFilter: Record<string, unknown> = { course: courseId, isDeleted: false };
  const lessonFilter: Record<string, unknown> = { course: courseId, isDeleted: false };
  if (!isOwner) lessonFilter.isPublished = true;

  const [modules, lessons] = await Promise.all([
    CourseModule.find(moduleFilter).sort({ position: 1, createdAt: 1 }),
    Lesson.find(lessonFilter).sort({ position: 1, createdAt: 1 }),
  ]);

  return { modules, lessons };
};

/**
 * Read access: admins and the owner see everything; everyone else may only
 * read a published course.
 */
const assertCourseReadAccess = (
  course: { status: string; instructor: { toString(): string } },
  user: AuthUser,
): void => {
  if (user.roles.includes('admin')) return;
  if (course.instructor.toString() === user.id) return;
  if (course.status !== 'published') throw ApiError.notFound('Course not found');
};

export const listInstructors = async (): Promise<unknown[]> =>
  User.find({ roles: 'instructor', isDeleted: false, status: 'active' })
    .select('fullName avatarUrl bio')
    .sort({ fullName: 1 });

export { toUserResponse };
