"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.revokeCertificate = exports.verifyCertificate = exports.listMyCertificates = exports.issueCertificate = exports.getEnrollmentProgress = exports.uncompleteLesson = exports.completeLesson = exports.getMyProgress = exports.cancelEnrollment = exports.updateEnrollment = exports.getEnrollmentById = exports.listEnrollments = exports.listMyEnrollments = exports.createEnrollment = void 0;
const mongoose_1 = require("mongoose");
const models_1 = require("../models");
const ApiError_1 = require("../utils/ApiError");
const pagination_1 = require("../utils/pagination");
const audit_service_1 = require("./audit.service");
const notification_service_1 = require("./notification.service");
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
const createEnrollment = async (input, user, req) => {
    const isAdmin = user.roles.includes('admin');
    if (input.student && input.student !== user.id && !isAdmin) {
        throw ApiError_1.ApiError.forbidden('You can only enrol yourself');
    }
    if (!isAdmin && !user.roles.includes('student')) {
        throw ApiError_1.ApiError.forbidden('Only students can enrol in courses');
    }
    const course = await models_1.Course.findOne({ _id: input.course, isDeleted: false });
    if (!course)
        throw ApiError_1.ApiError.notFound('Course not found');
    if (course.status !== 'published')
        throw ApiError_1.ApiError.badRequest('This course is not open for enrolment');
    const studentId = isAdmin && input.student ? input.student : user.id;
    if (course.instructor.toString() === studentId) {
        throw ApiError_1.ApiError.badRequest('You cannot enrol in your own course');
    }
    const student = await models_1.User.findOne({ _id: studentId, isDeleted: false, status: 'active' });
    if (!student)
        throw ApiError_1.ApiError.notFound('Student not found');
    const existing = await models_1.Enrollment.findOne({ course: course._id, student: studentId });
    if (existing) {
        if (existing.status === 'cancelled') {
            existing.status = 'active';
            existing.lastAccessedAt = new Date();
            await existing.save();
            return existing.populate(ENROLLMENT_POPULATE);
        }
        throw ApiError_1.ApiError.conflict('You are already enrolled in this course');
    }
    const enrollment = await models_1.Enrollment.create({
        course: course._id,
        student: studentId,
        status: 'active',
    });
    await models_1.Course.findByIdAndUpdate(course._id, { $inc: { enrollmentCount: 1 } });
    await (0, notification_service_1.createNotification)({
        user: course.instructor,
        type: 'enrollment',
        title: 'New enrolment',
        message: `${student.fullName} enrolled in "${course.title}".`,
        link: `/instructor/courses/${course._id}/students`,
    });
    await (0, audit_service_1.recordAudit)({
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
exports.createEnrollment = createEnrollment;
const listMyEnrollments = async (user, query = {}) => {
    const { page, limit, skip } = (0, pagination_1.parsePagination)(query);
    const filter = { student: user.id };
    if (query.status)
        filter.status = query.status;
    const [items, total] = await Promise.all([
        models_1.Enrollment.find(filter)
            .populate(ENROLLMENT_POPULATE)
            .sort({ lastAccessedAt: -1 })
            .skip(skip)
            .limit(limit),
        models_1.Enrollment.countDocuments(filter),
    ]);
    return { items, meta: (0, pagination_1.buildPaginationMeta)(total, page, limit) };
};
exports.listMyEnrollments = listMyEnrollments;
const listEnrollments = async (query, _user) => {
    const { page, limit, skip } = (0, pagination_1.parsePagination)(query);
    const filter = {};
    if (query.course)
        filter.course = query.course;
    if (query.student)
        filter.student = query.student;
    if (query.status)
        filter.status = query.status;
    const [items, total] = await Promise.all([
        models_1.Enrollment.find(filter)
            .populate(ENROLLMENT_POPULATE)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        models_1.Enrollment.countDocuments(filter),
    ]);
    return { items, meta: (0, pagination_1.buildPaginationMeta)(total, page, limit) };
};
exports.listEnrollments = listEnrollments;
const getEnrollmentById = async (id, user) => {
    const enrollment = await models_1.Enrollment.findById(id).populate(ENROLLMENT_POPULATE);
    if (!enrollment)
        throw ApiError_1.ApiError.notFound('Enrollment not found');
    const isOwner = enrollment.student.toString() === user.id;
    if (!isOwner && !user.roles.includes('admin')) {
        const course = enrollment.course;
        if (course.instructor.toString() !== user.id) {
            throw ApiError_1.ApiError.forbidden('You do not have access to this enrollment');
        }
    }
    return enrollment;
};
exports.getEnrollmentById = getEnrollmentById;
const updateEnrollment = async (id, input, user, req) => {
    const enrollment = await models_1.Enrollment.findById(id);
    if (!enrollment)
        throw ApiError_1.ApiError.notFound('Enrollment not found');
    if (!user.roles.includes('admin')) {
        const course = await models_1.Course.findById(enrollment.course);
        if (!course || course.instructor.toString() !== user.id) {
            throw ApiError_1.ApiError.forbidden('You can only manage enrolments for your own courses');
        }
    }
    Object.assign(enrollment, input);
    await enrollment.save();
    await (0, audit_service_1.recordAudit)({
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
exports.updateEnrollment = updateEnrollment;
const cancelEnrollment = async (id, user, req) => {
    const enrollment = await models_1.Enrollment.findById(id);
    if (!enrollment)
        throw ApiError_1.ApiError.notFound('Enrollment not found');
    const isOwner = enrollment.student.toString() === user.id;
    if (!isOwner && !user.roles.includes('admin')) {
        const course = await models_1.Course.findById(enrollment.course);
        if (!course || course.instructor.toString() !== user.id) {
            throw ApiError_1.ApiError.forbidden('You can only cancel enrolments for your own courses');
        }
    }
    if (enrollment.status === 'completed') {
        throw ApiError_1.ApiError.badRequest('A completed enrollment cannot be cancelled');
    }
    enrollment.status = 'cancelled';
    enrollment.lastAccessedAt = new Date();
    await enrollment.save();
    await models_1.Course.findByIdAndUpdate(enrollment.course, { $inc: { enrollmentCount: -1 } });
    await (0, audit_service_1.recordAudit)({
        req,
        actorId: user.id,
        actorRole: user.roles[0],
        action: 'enrollment.cancel',
        entity: 'Enrollment',
        entityId: id,
    });
};
exports.cancelEnrollment = cancelEnrollment;
/* -------------------------------------------------------------------------- */
/* Progress                                                                    */
/* -------------------------------------------------------------------------- */
const getMyProgress = async (user) => models_1.Enrollment.find({ student: user.id, status: { $ne: 'cancelled' } })
    .populate(ENROLLMENT_POPULATE)
    .sort({ lastAccessedAt: -1 });
exports.getMyProgress = getMyProgress;
/** Marks a lesson complete, recomputes progress and issues a certificate. */
const completeLesson = async (lessonId, user) => {
    const lesson = await models_1.Lesson.findOne({ _id: lessonId, isDeleted: false, isPublished: true });
    if (!lesson)
        throw ApiError_1.ApiError.notFound('Lesson not found');
    const enrollment = await models_1.Enrollment.findOne({
        course: lesson.course,
        student: user.id,
        status: { $in: ['active', 'completed'] },
    });
    if (!enrollment)
        throw ApiError_1.ApiError.forbidden('Enrol in this course to track progress');
    if (!enrollment.completedLessons.some((id) => id.toString() === lessonId)) {
        enrollment.completedLessons.push(lesson._id);
    }
    enrollment.timeSpentMinutes += lesson.durationMinutes || 0;
    enrollment.lastAccessedAt = new Date();
    const totalLessons = await models_1.Lesson.countDocuments({
        course: lesson.course,
        isDeleted: false,
        isPublished: true,
    });
    enrollment.progress = (0, models_1.calculateProgress)(enrollment.completedLessons.length, totalLessons);
    if (enrollment.progress >= 100 && enrollment.status !== 'completed') {
        enrollment.status = 'completed';
        enrollment.completedAt = new Date();
    }
    await enrollment.save();
    const certificate = enrollment.status === 'completed'
        ? await (0, exports.issueCertificate)(enrollment._id.toString(), user.id)
        : null;
    return { enrollment, certificate };
};
exports.completeLesson = completeLesson;
/** Undoes a completion, recomputing progress downwards. */
const uncompleteLesson = async (lessonId, user) => {
    const lesson = await models_1.Lesson.findOne({ _id: lessonId, isDeleted: false });
    if (!lesson)
        throw ApiError_1.ApiError.notFound('Lesson not found');
    const enrollment = await models_1.Enrollment.findOne({
        course: lesson.course,
        student: user.id,
        status: { $in: ['active', 'completed'] },
    });
    if (!enrollment)
        throw ApiError_1.ApiError.forbidden('Enrollment not found');
    enrollment.completedLessons = enrollment.completedLessons.filter((id) => id.toString() !== lessonId);
    const totalLessons = await models_1.Lesson.countDocuments({
        course: lesson.course,
        isDeleted: false,
        isPublished: true,
    });
    enrollment.progress = (0, models_1.calculateProgress)(enrollment.completedLessons.length, totalLessons);
    if (enrollment.status === 'completed' && enrollment.progress < 100) {
        enrollment.status = 'active';
        enrollment.completedAt = undefined;
    }
    await enrollment.save();
    return enrollment;
};
exports.uncompleteLesson = uncompleteLesson;
const getEnrollmentProgress = async (enrollmentId, user) => {
    const enrollment = await models_1.Enrollment.findById(enrollmentId).populate(ENROLLMENT_POPULATE);
    if (!enrollment)
        throw ApiError_1.ApiError.notFound('Enrollment not found');
    const isOwner = enrollment.student.toString() === user.id;
    if (!isOwner && !user.roles.includes('admin')) {
        throw ApiError_1.ApiError.forbidden('You do not have access to this enrollment');
    }
    const lessons = await models_1.Lesson.find({
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
exports.getEnrollmentProgress = getEnrollmentProgress;
/* -------------------------------------------------------------------------- */
/* Certificates                                                                */
/* -------------------------------------------------------------------------- */
/** Issues a certificate for a completed enrolment (idempotent). */
const issueCertificate = async (enrollmentId, studentId) => {
    const enrollment = await models_1.Enrollment.findById(enrollmentId);
    if (!enrollment || enrollment.status !== 'completed')
        return null;
    const existing = await models_1.Certificate.findOne({
        enrollment: enrollment._id,
        student: studentId,
    });
    if (existing)
        return existing;
    const count = await models_1.Certificate.countDocuments();
    const salt = String(studentId).slice(-4);
    const serialNumber = (0, models_1.buildSerialNumber)(count + 1, salt);
    const certificate = await models_1.Certificate.create({
        serialNumber,
        course: enrollment.course,
        student: studentId,
        enrollment: enrollment._id,
        finalScore: enrollment.finalScore,
    });
    const course = await models_1.Course.findById(enrollment.course).select('title slug');
    if (course) {
        await (0, notification_service_1.createNotification)({
            user: studentId,
            type: 'announcement',
            title: 'Certificate issued',
            message: `You completed "${course.title}". Your certificate is ready.`,
            link: '/learn/certificates',
        });
    }
    return certificate;
};
exports.issueCertificate = issueCertificate;
const listMyCertificates = async (user) => models_1.Certificate.find({ student: user.id, revokedAt: { $exists: false } })
    .populate('course', 'title slug thumbnailUrl')
    .sort({ issuedAt: -1 });
exports.listMyCertificates = listMyCertificates;
/** Public verification by serial number. */
const verifyCertificate = async (serialNumber) => {
    const certificate = await models_1.Certificate.findOne({ serialNumber: serialNumber.toUpperCase() })
        .populate('course', 'title slug')
        .populate('student', 'fullName');
    if (!certificate)
        throw ApiError_1.ApiError.notFound('No certificate found with that serial number');
    return certificate;
};
exports.verifyCertificate = verifyCertificate;
const revokeCertificate = async (id, user) => {
    const certificate = await models_1.Certificate.findById(id);
    if (!certificate)
        throw ApiError_1.ApiError.notFound('Certificate not found');
    certificate.revokedAt = new Date();
    certificate.revokedBy = new mongoose_1.Types.ObjectId(user.id);
    await certificate.save();
    return certificate;
};
exports.revokeCertificate = revokeCertificate;
//# sourceMappingURL=enrollment.service.js.map