"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gradeSubmission = exports.listSubmissions = exports.listMySubmissions = exports.createSubmission = void 0;
const mongoose_1 = require("mongoose");
const models_1 = require("../models");
const ApiError_1 = require("../utils/ApiError");
const pagination_1 = require("../utils/pagination");
const audit_service_1 = require("./audit.service");
const notification_service_1 = require("./notification.service");
const SUBMISSION_POPULATE = [
    { path: 'course', select: 'title slug' },
    { path: 'student', select: 'fullName email avatarUrl' },
    { path: 'lesson', select: 'title' },
    { path: 'assignment', select: 'title dueDate maxMarks' },
];
/** Asserts the caller owns the course a submission belongs to. */
const assertCourseOwner = async (courseId, user) => {
    if (user.roles.includes('admin'))
        return;
    const course = await models_1.Course.findById(courseId);
    if (!course)
        throw ApiError_1.ApiError.notFound('Course not found');
    if (course.instructor.toString() !== user.id) {
        throw ApiError_1.ApiError.forbidden('You can only manage submissions for your own courses');
    }
};
/** Requires an active or completed enrolment before work is accepted. */
const requireEnrollment = async (courseId, user) => {
    const enrollment = await models_1.Enrollment.findOne({
        course: courseId,
        student: user.id,
        status: { $in: ['active', 'completed'] },
    });
    if (!enrollment)
        throw ApiError_1.ApiError.forbidden('Enrol in this course to submit assignments');
    return enrollment;
};
const createSubmission = async (input, user, req) => {
    if (!user.roles.includes('student')) {
        throw ApiError_1.ApiError.forbidden('Only students can submit assignments');
    }
    /* ---------- path 1: a first-class assignment ---------- */
    if ('assignment' in input) {
        const assignment = await models_1.Assignment.findById(input.assignment);
        if (!assignment)
            throw ApiError_1.ApiError.notFound('Assignment not found');
        if (!assignment.isPublished) {
            throw ApiError_1.ApiError.forbidden('This assignment has not been published yet');
        }
        const enrollment = await requireEnrollment(assignment.course.toString(), user);
        // Friendly duplicate guard. The unique index on { assignment, student } is
        // the real guarantee; this turns the resulting race into a 409.
        const duplicate = await models_1.Submission.findOne({
            assignment: assignment._id,
            student: user.id,
        });
        if (duplicate)
            throw ApiError_1.ApiError.conflict('You have already submitted this assignment');
        const submission = await models_1.Submission.create({
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
        await (0, audit_service_1.recordAudit)({
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
    const lesson = await models_1.Lesson.findOne({
        _id: input.lesson,
        course: input.course,
        isDeleted: false,
    });
    if (!lesson)
        throw ApiError_1.ApiError.notFound('Lesson not found in this course');
    if (lesson.type !== 'assignment') {
        throw ApiError_1.ApiError.badRequest('This lesson is not an assignment');
    }
    const enrollment = await requireEnrollment(input.course, user);
    const duplicate = await models_1.Submission.findOne({ student: user.id, lesson: input.lesson });
    if (duplicate)
        throw ApiError_1.ApiError.conflict('You have already submitted this assignment');
    const submission = await models_1.Submission.create({
        course: input.course,
        lesson: input.lesson,
        assignmentTitle: lesson.title,
        student: user.id,
        enrollment: enrollment._id,
        content: input.content,
        attachments: input.attachments,
    });
    await (0, audit_service_1.recordAudit)({
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
exports.createSubmission = createSubmission;
const listMySubmissions = async (user, query = {}) => {
    const { page, limit, skip } = (0, pagination_1.parsePagination)(query);
    const filter = { student: user.id };
    if (query.status)
        filter.status = query.status;
    const [items, total] = await Promise.all([
        models_1.Submission.find(filter)
            .populate(SUBMISSION_POPULATE)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        models_1.Submission.countDocuments(filter),
    ]);
    return { items, meta: (0, pagination_1.buildPaginationMeta)(total, page, limit) };
};
exports.listMySubmissions = listMySubmissions;
const listSubmissions = async (query, user) => {
    const filter = {};
    if (query.course)
        filter.course = query.course;
    if (query.student)
        filter.student = query.student;
    if (query.status)
        filter.status = query.status;
    if (query.course) {
        await assertCourseOwner(query.course, user);
    }
    else if (!user.roles.includes('admin')) {
        // Without a course filter, instructors only see their own courses.
        const courses = await models_1.Course.find({ instructor: user.id }).select('_id');
        filter.course = { $in: courses.map((course) => course._id) };
    }
    const { page, limit, skip } = (0, pagination_1.parsePagination)(query);
    const [items, total] = await Promise.all([
        models_1.Submission.find(filter)
            .populate(SUBMISSION_POPULATE)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        models_1.Submission.countDocuments(filter),
    ]);
    return { items, meta: (0, pagination_1.buildPaginationMeta)(total, page, limit) };
};
exports.listSubmissions = listSubmissions;
const gradeSubmission = async (id, input, user, req) => {
    const submission = await models_1.Submission.findById(id);
    if (!submission)
        throw ApiError_1.ApiError.notFound('Submission not found');
    await assertCourseOwner(submission.course.toString(), user);
    // Assignment work is marked against its own scale; everything else uses the
    // 0-100 scale the validator already enforces.
    if (submission.maxMarks !== undefined && input.grade > submission.maxMarks) {
        throw ApiError_1.ApiError.badRequest(`Grade cannot exceed the maximum of ${submission.maxMarks} marks`);
    }
    submission.grade = input.grade;
    submission.feedback = input.feedback;
    submission.status = input.status;
    submission.gradedBy = new mongoose_1.Types.ObjectId(user.id);
    submission.gradedAt = new Date();
    await submission.save();
    const awarded = submission.maxMarks !== undefined
        ? `${input.grade}/${submission.maxMarks} (${(0, models_1.gradePercentage)(input.grade, submission.maxMarks)}%)`
        : `${input.grade}%`;
    await (0, notification_service_1.createNotification)({
        user: submission.student.toString(),
        type: 'grade',
        title: 'Assignment graded',
        message: `You scored ${awarded} on "${submission.assignmentTitle}".`,
        link: '/learn/progress',
    });
    await (0, audit_service_1.recordAudit)({
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
exports.gradeSubmission = gradeSubmission;
//# sourceMappingURL=submission.service.js.map