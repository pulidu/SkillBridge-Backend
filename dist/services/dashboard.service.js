"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAuditLogs = exports.getAdminDashboard = exports.getInstructorDashboard = exports.getStudentDashboard = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const constants_1 = require("../constants");
const models_1 = require("../models");
const pagination_1 = require("../utils/pagination");
const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
/** Aggregates the caller's own learning activity. */
const getStudentDashboard = async (user) => {
    const enrollments = await models_1.Enrollment.find({
        student: user.id,
        status: { $ne: 'cancelled' },
    })
        .populate('course', 'title slug thumbnailUrl totalLessons durationMinutes level')
        .sort({ lastAccessedAt: -1 });
    const attemptStats = await models_1.Attempt.aggregate([
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
        models_1.Certificate.countDocuments({ student: user.id, revokedAt: null }),
        models_1.Enrollment.countDocuments({ student: user.id, status: 'completed' }),
        models_1.Enrollment.aggregate([
            { $match: { student: user.id } },
            { $group: { _id: null, minutes: { $sum: '$timeSpentMinutes' } } },
        ]),
    ]);
    const active = enrollments.filter((enrollment) => enrollment.status === 'active');
    const averageProgress = enrollments.length
        ? Math.round(enrollments.reduce((sum, enrollment) => sum + enrollment.progress, 0) / enrollments.length)
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
exports.getStudentDashboard = getStudentDashboard;
/** Aggregates the caller's own teaching activity. */
const getInstructorDashboard = async (user) => {
    const courses = await models_1.Course.find({ instructor: user.id, isDeleted: false })
        .select('title slug status totalLessons enrollmentCount averageRating ratingCount price createdAt')
        .sort({ createdAt: -1 });
    const courseIds = courses.map((course) => course._id);
    const [enrollmentTotals, statusBreakdown, pendingSubmissions] = await Promise.all([
        models_1.Enrollment.aggregate([
            { $match: { course: { $in: courseIds } } },
            { $group: { _id: null, total: { $sum: 1 }, averageProgress: { $avg: '$progress' } } },
        ]),
        models_1.Enrollment.aggregate([
            { $match: { course: { $in: courseIds } } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        models_1.Submission.countDocuments({
            course: mongoose_1.default.trusted({ $in: courseIds }),
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
        ? Math.round((published.reduce((sum, course) => sum + course.averageRating, 0) / published.length) * 10) / 10
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
exports.getInstructorDashboard = getInstructorDashboard;
/** Platform-wide statistics for administrators. */
const getAdminDashboard = async (_user) => {
    const thirtyDaysAgo = startOfDay(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const [activeStudents, activeInstructors, pendingSubmissions, signUpTrend, topCourses, levelBreakdown, totalQuizzes, certificatesIssued, revenueAgg, signupsCount,] = await Promise.all([
        models_1.User.countDocuments({ roles: 'student', status: 'active', isDeleted: false }),
        models_1.User.countDocuments({ roles: 'instructor', status: 'active', isDeleted: false }),
        models_1.Submission.countDocuments({ status: 'submitted' }),
        models_1.User.aggregate([
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]),
        models_1.Course.find({ isDeleted: false, status: 'published' })
            .populate('instructor', 'fullName')
            .select('title slug enrollmentCount averageRating price')
            .sort({ enrollmentCount: -1 })
            .limit(5),
        models_1.Course.aggregate([
            { $match: { isDeleted: false, status: 'published' } },
            { $group: { _id: '$level', count: { $sum: 1 } } },
        ]),
        models_1.Quiz.countDocuments({ isDeleted: false }),
        models_1.Certificate.countDocuments({ revokedAt: null }),
        models_1.Course.aggregate([
            { $match: { isDeleted: false, status: 'published' } },
            { $group: { _id: null, total: { $sum: '$price' } } },
        ]),
        models_1.User.countDocuments({ createdAt: mongoose_1.default.trusted({ $gte: thirtyDaysAgo }) }),
    ]);
    const [courseTotals, enrollmentTotals, userTotals, totalLessons] = await Promise.all([
        models_1.Course.aggregate([
            { $match: { isDeleted: false } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        models_1.Enrollment.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        models_1.User.aggregate([
            { $match: { isDeleted: false } },
            { $group: { _id: '$roles', count: { $sum: 1 } } },
        ]),
        models_1.Lesson.countDocuments({ isDeleted: false }),
    ]);
    const flatten = (rows) => rows.reduce((acc, row) => {
        const key = Array.isArray(row._id) ? row._id.join(',') : String(row._id);
        acc[key] = row.count;
        return acc;
    }, {});
    const roleMap = flatten(userTotals);
    const courseStatusMap = flatten(courseTotals);
    const enrollmentStatusMap = flatten(enrollmentTotals);
    const sum = (values) => Object.values(values).reduce((a, b) => a + b, 0);
    // A user holds exactly one role, so the aggregate keys are single values.
    // Multi-role arrays still group under a comma-joined key, which is split here
    // so a user holding two roles contributes to both tallies.
    const byRole = (role) => Object.entries(roleMap).reduce((count, [key, value]) => (key.split(',').includes(role) ? count + value : count), 0);
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
    const roleBreakdown = constants_1.ROLES.map((role) => ({
        role,
        count: byRole(role),
    }));
    const courseStatusBreakdown = constants_1.COURSE_STATUSES.map((status) => ({
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
exports.getAdminDashboard = getAdminDashboard;
/* -------------------------------------------------------------------------- */
/* Audit log listing                                                           */
/* -------------------------------------------------------------------------- */
const listAuditLogs = async (query) => {
    const { page, limit, skip } = (0, pagination_1.parsePagination)(query);
    const filter = {};
    if (query.actor)
        filter.actor = query.actor;
    if (query.entity)
        filter.entity = query.entity;
    if (query.action)
        filter.action = { $regex: `^${query.action.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` };
    const { AuditLog } = await Promise.resolve().then(() => __importStar(require('../models')));
    const [items, total] = await Promise.all([
        AuditLog.find(filter)
            .populate('actor', 'fullName email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        AuditLog.countDocuments(filter),
    ]);
    return { items, meta: (0, pagination_1.buildPaginationMeta)(total, page, limit) };
};
exports.listAuditLogs = listAuditLogs;
//# sourceMappingURL=dashboard.service.js.map