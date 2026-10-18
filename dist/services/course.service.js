"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.availableSortOptions = exports.listCategoriesWithCounts = exports.recalculateCourseRatings = exports.recalculateCourseStats = exports.assertCourseOwnership = exports.listCourseStudents = exports.listCourseRatings = exports.rateCourse = exports.getCourseAnalytics = exports.setCourseStatus = exports.deleteCourse = exports.updateCourse = exports.assignCourseInstructor = exports.createCourse = exports.getCourseBySlug = exports.getCourseById = exports.listFeaturedCourses = exports.listCourses = void 0;
const constants_1 = require("../constants");
const models_1 = require("../models");
const ApiError_1 = require("../utils/ApiError");
const pagination_1 = require("../utils/pagination");
const slug_1 = require("../utils/slug");
const audit_service_1 = require("./audit.service");
const notification_service_1 = require("./notification.service");
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
const applyVisibility = (filter, user) => {
    if (!user)
        return { ...filter, status: 'published' };
    if (user.roles.includes('admin'))
        return filter;
    if (user.roles.includes('instructor')) {
        return { ...filter, $or: [{ instructor: user.id }, { status: 'published' }] };
    }
    return { ...filter, status: 'published' };
};
const buildSort = (sort) => {
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
const listCourses = async (input, user) => {
    const { page, limit, skip } = (0, pagination_1.parsePagination)(input);
    const filter = { isDeleted: false };
    if (input.category)
        filter.category = input.category;
    if (input.level)
        filter.level = input.level;
    if (input.status)
        filter.status = input.status;
    if (input.instructor)
        filter.instructor = input.instructor;
    if (input.tag)
        filter.tags = input.tag;
    if (input.minRating !== undefined)
        filter.averageRating = { $gte: input.minRating };
    if (input.maxPrice !== undefined)
        filter.price = { $lte: input.maxPrice };
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
        models_1.Course.find(visible)
            .populate(COURSE_POPULATE)
            .sort(buildSort(input.sort ?? 'newest'))
            .skip(skip)
            .limit(limit),
        models_1.Course.countDocuments(visible),
    ]);
    return { items: courses, meta: (0, pagination_1.buildPaginationMeta)(total, page, limit) };
};
exports.listCourses = listCourses;
/** Highest rated published courses, used on the landing page. */
const listFeaturedCourses = async (limit = 6) => models_1.Course.find({ isDeleted: false, status: 'published' })
    .populate(COURSE_POPULATE)
    .sort({ averageRating: -1, enrollmentCount: -1 })
    .limit(limit);
exports.listFeaturedCourses = listFeaturedCourses;
const getCourseById = async (id, user) => {
    const course = await models_1.Course.findById(id).populate(COURSE_POPULATE);
    if (!course || course.isDeleted)
        throw ApiError_1.ApiError.notFound('Course not found');
    const visible = applyVisibility({ _id: course._id }, user);
    const permitted = await models_1.Course.exists(visible);
    if (!permitted)
        throw ApiError_1.ApiError.notFound('Course not found');
    return course;
};
exports.getCourseById = getCourseById;
const getCourseBySlug = async (slug, user) => {
    const course = await models_1.Course.findOne({ slug, isDeleted: false }).populate(COURSE_POPULATE);
    if (!course)
        throw ApiError_1.ApiError.notFound('Course not found');
    const permitted = await models_1.Course.exists(applyVisibility({ _id: course._id }, user));
    if (!permitted)
        throw ApiError_1.ApiError.notFound('Course not found');
    return course;
};
exports.getCourseBySlug = getCourseBySlug;
/**
 * Resolves the owning instructor for a course.
 *
 * An instructor always owns what they create, so a mismatch is only tolerated
 * for an admin. The target must be an existing, undeleted account that can
 * actually teach, which is what stops a course being parked on a student.
 */
const resolveInstructorId = async (requested, actor) => {
    if (!requested || requested === actor.id) {
        if (requested && requested === actor.id)
            return actor.id;
        if (!actor.roles.includes('instructor') && !actor.roles.includes('admin')) {
            throw ApiError_1.ApiError.forbidden('Only instructors can own a course');
        }
        return actor.id;
    }
    if (!actor.roles.includes('admin')) {
        throw ApiError_1.ApiError.forbidden('You can only create courses under your own account');
    }
    const owner = await models_1.User.findOne({ _id: requested, isDeleted: false });
    if (!owner)
        throw ApiError_1.ApiError.notFound('Instructor not found');
    if (!owner.roles.includes('instructor') && !owner.roles.includes('admin')) {
        throw ApiError_1.ApiError.badRequest('Courses can only be assigned to instructors');
    }
    return String(owner._id);
};
const createCourse = async (input, user, req) => {
    const category = await models_1.Category.findById(input.category);
    if (!category)
        throw ApiError_1.ApiError.notFound('Category not found');
    const instructorId = await resolveInstructorId(input.instructor, user);
    const slug = await (0, slug_1.uniqueSlug)(input.title, async (candidate) => Boolean(await models_1.Course.exists({ slug: candidate })));
    const course = await models_1.Course.create({
        ...input,
        slug,
        instructor: instructorId,
        shortDescription: input.shortDescription ?? input.description.slice(0, 180),
    });
    await (0, audit_service_1.recordAudit)({
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
exports.createCourse = createCourse;
/**
 * Reassigns (or assigns) the instructor responsible for a course.
 *
 * Admin only, enforced by `authorize('admin')` on the route. Separated from
 * `updateCourse` because changing ownership is an administrative act with its
 * own audit trail, not an ordinary content edit.
 */
const assignCourseInstructor = async (id, instructorId, user, req) => {
    const course = await models_1.Course.findById(id);
    if (!course || course.isDeleted)
        throw ApiError_1.ApiError.notFound('Course not found');
    const owner = await models_1.User.findOne({ _id: instructorId, isDeleted: false });
    if (!owner)
        throw ApiError_1.ApiError.notFound('Instructor not found');
    if (!owner.roles.includes('instructor') && !owner.roles.includes('admin')) {
        throw ApiError_1.ApiError.badRequest('Courses can only be assigned to instructors');
    }
    if (owner.status !== 'active') {
        throw ApiError_1.ApiError.badRequest('That instructor account is suspended');
    }
    const previous = course.instructor;
    course.instructor = owner._id;
    await course.save();
    await (0, audit_service_1.recordAudit)({
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
exports.assignCourseInstructor = assignCourseInstructor;
const updateCourse = async (id, input, user, req) => {
    const course = await models_1.Course.findById(id);
    if (!course || course.isDeleted)
        throw ApiError_1.ApiError.notFound('Course not found');
    (0, exports.assertCourseOwnership)(course, user);
    if (input.category) {
        const category = await models_1.Category.findById(input.category);
        if (!category)
            throw ApiError_1.ApiError.notFound('Category not found');
    }
    const update = { ...input };
    // Ownership is an administrative act with its own route and audit trail, so
    // it is stripped here rather than silently applied through a content edit.
    if (input.instructor !== undefined) {
        delete update.instructor;
        throw ApiError_1.ApiError.badRequest('Use the assign instructor endpoint to change a course instructor');
    }
    if (input.title && input.title !== course.title) {
        update.slug = await (0, slug_1.uniqueSlug)(input.title, async (candidate) => Boolean(await models_1.Course.exists({ slug: candidate, _id: { $ne: id } })));
    }
    const updated = await models_1.Course.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
    if (!updated)
        throw ApiError_1.ApiError.notFound('Course not found');
    await (0, audit_service_1.recordAudit)({
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
exports.updateCourse = updateCourse;
/**
 * Soft delete, then recompute the denormalised lesson counters.
 *
 * Safeguard: a course that still has learners is not silently removed. The
 * admin must unpublish it, or archive it, so the roster keeps working and a
 * student mid-course is not left pointing at nothing. Only a course with no
 * live enrolments can be deleted outright.
 */
const deleteCourse = async (id, user, req) => {
    const course = await models_1.Course.findById(id);
    if (!course || course.isDeleted)
        throw ApiError_1.ApiError.notFound('Course not found');
    (0, exports.assertCourseOwnership)(course, user);
    const liveEnrollments = await models_1.Enrollment.countDocuments({
        course: id,
        status: { $ne: 'cancelled' },
    });
    if (liveEnrollments > 0) {
        throw ApiError_1.ApiError.conflict(`This course still has ${liveEnrollments} active or completed enrollment${liveEnrollments === 1 ? '' : 's'}. Unpublish or archive it instead of deleting.`);
    }
    course.isDeleted = true;
    if (course.status !== 'archived')
        course.status = 'archived';
    await course.save();
    await (0, exports.recalculateCourseStats)(id);
    await (0, audit_service_1.recordAudit)({
        req,
        actorId: user.id,
        actorRole: user.roles[0],
        action: 'course.delete',
        entity: 'Course',
        entityId: id,
        meta: { title: course.title },
    });
};
exports.deleteCourse = deleteCourse;
/** Transitions a course between draft, published and archived. */
const setCourseStatus = async (id, status, user, req) => {
    const course = await models_1.Course.findById(id);
    if (!course || course.isDeleted)
        throw ApiError_1.ApiError.notFound('Course not found');
    (0, exports.assertCourseOwnership)(course, user);
    if (status === 'published') {
        const lessonCount = await models_1.Lesson.countDocuments({ course: id, isDeleted: false });
        if (lessonCount === 0) {
            throw ApiError_1.ApiError.badRequest('Add at least one lesson before publishing');
        }
    }
    course.status = status;
    if (status === 'published' && !course.publishedAt)
        course.publishedAt = new Date();
    await course.save();
    await (0, audit_service_1.recordAudit)({
        req,
        actorId: user.id,
        actorRole: user.roles[0],
        action: `course.${status}`,
        entity: 'Course',
        entityId: id,
    });
    if (status === 'published') {
        await (0, notification_service_1.notifyEnrolledStudents)(id, {
            type: 'course_update',
            title: 'Course published',
            message: `"${course.title}" is now live.`,
            link: `/courses/${course.slug}`,
        }).catch(() => undefined);
    }
    return course.populate(COURSE_POPULATE);
};
exports.setCourseStatus = setCourseStatus;
/** Enrolment and completion statistics for one course. */
const getCourseAnalytics = async (id, user) => {
    const course = await models_1.Course.findById(id);
    if (!course || course.isDeleted)
        throw ApiError_1.ApiError.notFound('Course not found');
    (0, exports.assertCourseOwnership)(course, user);
    const [statusBreakdown, completion, total] = await Promise.all([
        models_1.Enrollment.aggregate([
            { $match: { course: course._id } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        models_1.Enrollment.aggregate([
            { $match: { course: course._id } },
            { $group: { _id: null, averageProgress: { $avg: '$progress' } } },
        ]),
        models_1.Enrollment.countDocuments({ course: course._id }),
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
exports.getCourseAnalytics = getCourseAnalytics;
/** Creates or updates the caller's rating and recomputes the course average. */
const rateCourse = async (id, input, user) => {
    const course = await models_1.Course.findById(id);
    if (!course || course.isDeleted)
        throw ApiError_1.ApiError.notFound('Course not found');
    if (course.instructor.toString() === user.id) {
        throw ApiError_1.ApiError.badRequest('You cannot review your own course');
    }
    await models_1.Rating.findOneAndUpdate({ course: course._id, user: user.id }, { value: input.value, review: input.review }, { new: true, upsert: true, runValidators: true });
    await (0, exports.recalculateCourseRatings)(id);
    await (0, notification_service_1.createNotification)({
        user: course.instructor,
        type: 'system',
        title: 'New course review',
        message: `${user.fullName} rated "${course.title}" ${input.value}/5.`,
        link: `/instructor/courses/${course._id}/students`,
    });
    return models_1.Course.findById(id).select('averageRating ratingCount');
};
exports.rateCourse = rateCourse;
const listCourseRatings = async (id, page, limit) => {
    const { skip } = (0, pagination_1.parsePagination)({ page, limit });
    const [items, total] = await Promise.all([
        models_1.Rating.find({ course: id })
            .populate('user', 'fullName avatarUrl')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        models_1.Rating.countDocuments({ course: id }),
    ]);
    return { items, meta: (0, pagination_1.buildPaginationMeta)(total, page, limit) };
};
exports.listCourseRatings = listCourseRatings;
/** Students enrolled in a course, with progress, for the instructor roster. */
const listCourseStudents = async (id, user, query) => {
    const course = await models_1.Course.findById(id);
    if (!course || course.isDeleted)
        throw ApiError_1.ApiError.notFound('Course not found');
    (0, exports.assertCourseOwnership)(course, user);
    const { page, limit, skip } = (0, pagination_1.parsePagination)(query);
    const filter = { course: course._id };
    if (query.status)
        filter.status = query.status;
    let roster = models_1.Enrollment.find(filter)
        .populate('student', 'fullName email avatarUrl')
        .sort({ lastAccessedAt: -1 });
    if (query.search) {
        const matching = await models_1.User.find({
            _id: { $in: (await models_1.Enrollment.find(filter).select('student').lean()).map((e) => e.student) },
            $or: [
                { fullName: { $regex: query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
                { email: { $regex: query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
            ],
        }).select('_id');
        roster = models_1.Enrollment.find({ ...filter, student: { $in: matching.map((u) => u._id) } })
            .populate('student', 'fullName email avatarUrl')
            .sort({ lastAccessedAt: -1 });
    }
    const [items, total] = await Promise.all([
        roster.skip(skip).limit(limit),
        models_1.Enrollment.countDocuments(filter),
    ]);
    return { items, meta: (0, pagination_1.buildPaginationMeta)(total, page, limit) };
};
exports.listCourseStudents = listCourseStudents;
/* -------------------------------------------------------------------------- */
/* Ownership + denormalisation helpers                                         */
/* -------------------------------------------------------------------------- */
/**
 * Throws 403 unless the caller is an admin or the course's instructor.
 * This is the object-level access check that `authorize` cannot do.
 */
const assertCourseOwnership = (course, user) => {
    if (user.roles.includes('admin'))
        return;
    if (course.instructor.toString() === user.id)
        return;
    throw ApiError_1.ApiError.forbidden('You can only manage your own courses');
};
exports.assertCourseOwnership = assertCourseOwnership;
/** Recomputes totalLessons / durationMinutes from the lessons collection. */
const recalculateCourseStats = async (courseId) => {
    const [summary] = await models_1.Lesson.aggregate([
        { $match: { course: courseId, isDeleted: false, isPublished: true } },
        {
            $group: {
                _id: null,
                totalLessons: { $sum: 1 },
                durationMinutes: { $sum: '$durationMinutes' },
            },
        },
    ]);
    await models_1.Course.findByIdAndUpdate(courseId, {
        $set: {
            totalLessons: summary?.totalLessons ?? 0,
            durationMinutes: summary?.durationMinutes ?? 0,
        },
    });
};
exports.recalculateCourseStats = recalculateCourseStats;
/** Recomputes averageRating / ratingCount from the ratings collection. */
const recalculateCourseRatings = async (courseId) => {
    const [summary] = await models_1.Rating.aggregate([
        { $match: { course: courseId } },
        { $group: { _id: null, average: { $avg: '$value' }, count: { $sum: 1 } } },
    ]);
    await models_1.Course.findByIdAndUpdate(courseId, {
        $set: {
            averageRating: summary ? Math.round(summary.average * 10) / 10 : 0,
            ratingCount: summary?.count ?? 0,
        },
    });
};
exports.recalculateCourseRatings = recalculateCourseRatings;
const listCategoriesWithCounts = async () => {
    const categories = await models_1.Category.find({ isActive: true, isDeleted: false }).sort({ name: 1 });
    const counts = await models_1.Course.aggregate([
        { $match: { status: 'published', isDeleted: false } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((entry) => [String(entry._id), entry.count]));
    return categories.map((category) => ({
        ...category.toJSON(),
        courseCount: countMap.get(String(category._id)) ?? 0,
    }));
};
exports.listCategoriesWithCounts = listCategoriesWithCounts;
const availableSortOptions = () => constants_1.COURSE_SORT_OPTIONS;
exports.availableSortOptions = availableSortOptions;
//# sourceMappingURL=course.service.js.map