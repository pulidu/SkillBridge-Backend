import mongoose from 'mongoose';
import {
  COURSE_STATUSES,
  ROLES,
  type CourseStatus,
  type Role,
} from '../constants';
import { Attempt, Certificate, Course, Enrollment, Lesson, Quiz, Submission, User } from '../models';
import type { AuthUser } from '../types';
import type { PaginatedResult } from '../types';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';

const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

/** Aggregates the caller's own learning activity. */
export const getStudentDashboard = async (user: AuthUser): Promise<unknown> => {
  const enrollments = await Enrollment.find({
    student: user.id,
    status: { $ne: 'cancelled' },
  })
    .populate('course', 'title slug thumbnailUrl totalLessons durationMinutes level')
    .sort({ lastAccessedAt: -1 });

  const attemptStats = await Attempt.aggregate([
    { $match: { student: user.id } },
    {
      $group: {
        _id: null,
        averagePercentage: { $avg: '$percentage' },
        totalAttempts: { $sum: 1 },
        passed: { $sum: { $cond: ['$passed', 1, 0] } },
      },
    },
  ]);

  const [certificates, completedCount, totalMinutes] = await Promise.all([
    Certificate.countDocuments({ student: user.id, revokedAt: null }),
    Enrollment.countDocuments({ student: user.id, status: 'completed' }),
    Enrollment.aggregate([
      { $match: { student: user.id } },
      { $group: { _id: null, minutes: { $sum: '$timeSpentMinutes' } } },
    ]),
  ]);

  const active = enrollments.filter((enrollment) => enrollment.status === 'active');
  const averageProgress = enrollments.length
    ? Math.round(
        enrollments.reduce((sum, enrollment) => sum + enrollment.progress, 0) / enrollments.length,
      )
    : 0;

  return {
    totals: {
      enrolled: enrollments.length,
      active: active.length,
      completed: completedCount,
      certificates,
      averageProgress,
      hoursLearned: Math.round(((totalMinutes[0]?.minutes ?? 0) / 60) * 10) / 10,
      averageQuizScore: attemptStats[0]?.averagePercentage
        ? Math.round(attemptStats[0].averagePercentage)
        : 0,
      totalAttempts: attemptStats[0]?.totalAttempts ?? 0,
    },
    continueLearning: active.slice(0, 5),
    recentEnrollments: enrollments.slice(0, 5),
  };
};

/** Aggregates the caller's own teaching activity. */
export const getInstructorDashboard = async (user: AuthUser): Promise<unknown> => {
  const courses = await Course.find({ instructor: user.id, isDeleted: false })
    .select('title slug status totalLessons enrollmentCount averageRating ratingCount price createdAt')
    .sort({ createdAt: -1 });

  const courseIds = courses.map((course) => course._id);

  const [enrollmentTotals, statusBreakdown, pendingSubmissions] = await Promise.all([
    Enrollment.aggregate([
      { $match: { course: { $in: courseIds } } },
      { $group: { _id: null, total: { $sum: 1 }, averageProgress: { $avg: '$progress' } } },
    ]),
    Enrollment.aggregate([
      { $match: { course: { $in: courseIds } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Submission.countDocuments({
      course: mongoose.trusted({ $in: courseIds }),
      status: 'submitted',
    }),
  ]);

  const published = courses.filter((course) => course.status === 'published');

  const totalCourses = courses.length;
  const publishedCourses = published.length;
  const draftCourses = courses.filter((course) => course.status === 'draft').length;
  const totalLearners = enrollmentTotals[0]?.total ?? 0;
  const averageCompletion = enrollmentTotals[0]?.averageProgress
    ? Math.round(enrollmentTotals[0].averageProgress)
    : 0;
  const averageRating = published.length
    ? Math.round(
        (published.reduce((sum, course) => sum + course.averageRating, 0) / published.length) * 10,
      ) / 10
    : 0;
  const pendingGrading = pendingSubmissions;
  const totalLessons = courses.reduce((sum, course) => sum + course.totalLessons, 0);

  const serializedCourses = courses.slice(0, 10).map((course) => ({
    id: String(course._id),
    title: course.title,
    slug: course.slug,
    status: course.status,
    price: course.price,
    totalLessons: course.totalLessons,
    enrollmentCount: course.enrollmentCount,
    averageRating: course.averageRating,
    ratingCount: course.ratingCount,
    durationMinutes: course.durationMinutes ?? 0,
    createdAt: course.createdAt,
  }));

  return {
    totalCourses,
    publishedCourses,
    draftCourses,
    totalLearners,
    averageCompletion,
    averageRating,
    pendingSubmissions: pendingGrading,
    topCourses: serializedCourses,
    totals: {
      courses: totalCourses,
      published: publishedCourses,
      drafts: draftCourses,
      totalLearners,
      averageLearnerProgress: averageCompletion,
      averageRating,
      pendingGrading,
      totalLessons,
    },
    byStatus: statusBreakdown.map((entry) => ({ status: entry._id, count: entry.count })),
    courses: serializedCourses,
  };
};

/** Platform-wide statistics for administrators. */
export const getAdminDashboard = async (_user: AuthUser): Promise<unknown> => {
  const thirtyDaysAgo = startOfDay(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

  const [
    activeStudents,
    activeInstructors,
    pendingSubmissions,
    signUpTrend,
    topCourses,
    levelBreakdown,
    totalQuizzes,
    certificatesIssued,
    revenueAgg,
    signupsCount,
  ] = await Promise.all([
    User.countDocuments({ roles: 'student', status: 'active', isDeleted: false }),
    User.countDocuments({ roles: 'instructor', status: 'active', isDeleted: false }),
    Submission.countDocuments({ status: 'submitted' }),
    User.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Course.find({ isDeleted: false, status: 'published' })
      .populate('instructor', 'fullName')
      .select('title slug enrollmentCount averageRating price')
      .sort({ enrollmentCount: -1 })
      .limit(5),
    Course.aggregate([
      { $match: { isDeleted: false, status: 'published' } },
      { $group: { _id: '$level', count: { $sum: 1 } } },
    ]),
    Quiz.countDocuments({ isDeleted: false }),
    Certificate.countDocuments({ revokedAt: null }),
    Course.aggregate([
      { $match: { isDeleted: false, status: 'published' } },
      { $group: { _id: null, total: { $sum: '$price' } } },
    ]),
    User.countDocuments({ createdAt: mongoose.trusted({ $gte: thirtyDaysAgo }) }),
  ]);

  const [courseTotals, enrollmentTotals, userTotals, totalLessons] = await Promise.all([
    Course.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Enrollment.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    User.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$roles', count: { $sum: 1 } } },
    ]),
    Lesson.countDocuments({ isDeleted: false }),
  ]);

  const flatten = (rows: { _id: string; count: number }[]): Record<string, number> =>
    rows.reduce<Record<string, number>>((acc, row) => {
      const key = Array.isArray(row._id) ? row._id.join(',') : String(row._id);
      acc[key] = row.count;
      return acc;
    }, {});

  const roleMap = flatten(userTotals);
  const courseStatusMap = flatten(courseTotals);
  const enrollmentStatusMap = flatten(enrollmentTotals);

  const sum = (values: Record<string, number>): number =>
    Object.values(values).reduce((a, b) => a + b, 0);

  // A user holds exactly one role, so the aggregate keys are single values.
  // Multi-role arrays still group under a comma-joined key, which is split here
  // so a user holding two roles contributes to both tallies.
  const byRole = (role: Role): number =>
    Object.entries(roleMap).reduce(
      (count, [key, value]) => (key.split(',').includes(role) ? count + value : count),
      0,
    );

  const totalUsers = sum(roleMap);
  const students = byRole('student');
  const instructors = byRole('instructor');
  const admins = byRole('admin');
  const totalCourses = sum(courseStatusMap);
  const publishedCourses = courseStatusMap['published'] ?? 0;
  const draftCourses = courseStatusMap['draft'] ?? 0;
  const archivedCourses = courseStatusMap['archived'] ?? 0;
  const totalEnrollments = sum(enrollmentStatusMap);
  const activeEnrollments = enrollmentStatusMap['active'] ?? 0;
  const completedEnrollments = enrollmentStatusMap['completed'] ?? 0;
  const revenueProxy = revenueAgg[0]?.total ?? 0;

  const roleBreakdown = ROLES.map((role: Role) => ({
    role,
    count: byRole(role),
  }));

  const courseStatusBreakdown = COURSE_STATUSES.map((status: CourseStatus) => ({
    status,
    count: courseStatusMap[status] ?? 0,
  }));

  return {
    totalUsers,
    students,
    instructors,
    totalCourses,
    publishedCourses,
    draftCourses,
    totalEnrollments,
    totalQuizzes,
    certificatesIssued,
    signupsLast30Days: signupsCount,
    revenueProxy,
    topCourses,
    roleBreakdown,
    pendingSubmissions,
    totalActiveStudents: activeStudents,
    totalActiveInstructors: activeInstructors,
    totals: {
      users: totalUsers,
      students,
      instructors,
      admins,
      courses: totalCourses,
      publishedCourses,
      draftCourses,
      archivedCourses,
      lessons: totalLessons,
      enrollments: totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      activeStudents,
      activeInstructors,
      pendingSubmissions,
    },
    courseStatusBreakdown,
    signUpTrend,
    byLevel: flatten(levelBreakdown),
  };
};

/* -------------------------------------------------------------------------- */
/* Audit log listing                                                           */
/* -------------------------------------------------------------------------- */

export const listAuditLogs = async (
  query: { page?: number; limit?: number; actor?: string; entity?: string; action?: string },
): Promise<PaginatedResult<unknown>> => {
  const { page, limit, skip } = parsePagination(query);

  const filter: Record<string, unknown> = {};
  if (query.actor) filter.actor = query.actor;
  if (query.entity) filter.entity = query.entity;
  if (query.action) filter.action = { $regex: `^${query.action.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` };

  const { AuditLog } = await import('../models');

  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('actor', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AuditLog.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta(total, page, limit) };
};
