import type { Request } from 'express';
import { Assignment, Course, Lesson, Submission } from '../models';
import type { AuthUser } from '../types';
import { ApiError } from '../utils/ApiError';
import type {
  CreateAssignmentInput,
  UpdateAssignmentInput,
} from '../validators/assignment.validator';
import { recordAudit } from './audit.service';
import { assertCourseOwnership } from './course.service';

const ASSIGNMENT_POPULATE = [
  { path: 'course', select: 'title slug status instructor' },
  { path: 'lesson', select: 'title position' },
];

/** Loads the course and asserts the caller may modify its content. */
const loadEditableCourse = async (courseId: string, user: AuthUser): Promise<void> => {
  const course = await Course.findById(courseId);
  if (!course) throw ApiError.notFound('Course not found');

  assertCourseOwnership(course, user);
};

/** True when the caller owns the course or is an admin. */
const canManageCourse = async (courseId: string, user: AuthUser): Promise<boolean> => {
  if (user.roles.includes('admin')) return true;

  const course = await Course.findById(courseId).select('instructor');
  return course?.instructor.toString() === user.id;
};

/**
 * Lists the assignments of a course. Unpublished work is only visible to the
 * owner and to admins, so a learner cannot see a task before it is released.
 */
export const listAssignments = async (
  courseId: string,
  includeUnpublished: boolean,
  user: AuthUser,
): Promise<unknown[]> => {
  const privileged = includeUnpublished && (await canManageCourse(courseId, user));
  const filter = privileged ? { course: courseId } : { course: courseId, isPublished: true };

  return Assignment.find(filter).populate(ASSIGNMENT_POPULATE).sort({ createdAt: 1 });
};

export const getAssignment = async (assignmentId: string, user: AuthUser): Promise<unknown> => {
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw ApiError.notFound('Assignment not found');

  if (!assignment.isPublished && !(await canManageCourse(assignment.course.toString(), user))) {
    // Reported as missing rather than forbidden so unpublished work stays hidden.
    throw ApiError.notFound('Assignment not found');
  }

  return assignment.populate(ASSIGNMENT_POPULATE);
};

export const createAssignment = async (
  courseId: string,
  input: CreateAssignmentInput,
  user: AuthUser,
  req: Request,
): Promise<unknown> => {
  await loadEditableCourse(courseId, user);

  // A linked lesson must belong to this course, otherwise the curriculum tree
  // would point across course boundaries.
  if (input.lesson) {
    const lesson = await Lesson.findOne({
      _id: input.lesson,
      course: courseId,
      isDeleted: false,
    }).select('_id');

    if (!lesson) throw ApiError.badRequest('Lesson does not belong to this course');
  }

  const assignment = await Assignment.create({ ...input, course: courseId });

  await recordAudit({
    req,
    actorId: user.id,
    actorRole: user.roles[0],
    action: 'assignment.create',
    entity: 'Assignment',
    entityId: String(assignment._id),
    meta: { course: courseId, title: assignment.title },
  });

  return assignment.populate(ASSIGNMENT_POPULATE);
};

export const updateAssignment = async (
  assignmentId: string,
  input: UpdateAssignmentInput,
  user: AuthUser,
  req: Request,
): Promise<unknown> => {
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw ApiError.notFound('Assignment not found');

  await loadEditableCourse(assignment.course.toString(), user);

  if (input.lesson) {
    const lesson = await Lesson.findOne({
      _id: input.lesson,
      course: assignment.course,
      isDeleted: false,
    }).select('_id');

    if (!lesson) throw ApiError.badRequest('Lesson does not belong to this course');
  }

  assignment.set(input);
  await assignment.save();

  await recordAudit({
    req,
    actorId: user.id,
    actorRole: user.roles[0],
    action: 'assignment.update',
    entity: 'Assignment',
    entityId: assignmentId,
    meta: { fields: Object.keys(input) },
  });

  return assignment.populate(ASSIGNMENT_POPULATE);
};

export const deleteAssignment = async (
  assignmentId: string,
  user: AuthUser,
  req: Request,
): Promise<{ message: string }> => {
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw ApiError.notFound('Assignment not found');

  await loadEditableCourse(assignment.course.toString(), user);

  // Refuse while work exists, so a learner never loses an already graded
  // submission. Unpublishing is the reversible alternative.
  const submitted = await Submission.exists({ assignment: assignment._id });
  if (submitted) {
    throw ApiError.conflict(
      'Learners have already submitted this assignment. Unpublish it instead of deleting it.',
    );
  }

  await assignment.deleteOne();

  await recordAudit({
    req,
    actorId: user.id,
    actorRole: user.roles[0],
    action: 'assignment.delete',
    entity: 'Assignment',
    entityId: assignmentId,
  });

  return { message: 'Assignment deleted' };
};