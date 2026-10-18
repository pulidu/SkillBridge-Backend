"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAssignment = exports.updateAssignment = exports.createAssignment = exports.getAssignment = exports.listAssignments = void 0;
const models_1 = require("../models");
const ApiError_1 = require("../utils/ApiError");
const audit_service_1 = require("./audit.service");
const course_service_1 = require("./course.service");
const ASSIGNMENT_POPULATE = [
    { path: 'course', select: 'title slug status instructor' },
    { path: 'lesson', select: 'title position' },
];
/** Loads the course and asserts the caller may modify its content. */
const loadEditableCourse = async (courseId, user) => {
    const course = await models_1.Course.findById(courseId);
    if (!course)
        throw ApiError_1.ApiError.notFound('Course not found');
    (0, course_service_1.assertCourseOwnership)(course, user);
};
/** True when the caller owns the course or is an admin. */
const canManageCourse = async (courseId, user) => {
    if (user.roles.includes('admin'))
        return true;
    const course = await models_1.Course.findById(courseId).select('instructor');
    return course?.instructor.toString() === user.id;
};
/**
 * Lists the assignments of a course. Unpublished work is only visible to the
 * owner and to admins, so a learner cannot see a task before it is released.
 */
const listAssignments = async (courseId, includeUnpublished, user) => {
    const privileged = includeUnpublished && (await canManageCourse(courseId, user));
    const filter = privileged ? { course: courseId } : { course: courseId, isPublished: true };
    return models_1.Assignment.find(filter).populate(ASSIGNMENT_POPULATE).sort({ createdAt: 1 });
};
exports.listAssignments = listAssignments;
const getAssignment = async (assignmentId, user) => {
    const assignment = await models_1.Assignment.findById(assignmentId);
    if (!assignment)
        throw ApiError_1.ApiError.notFound('Assignment not found');
    if (!assignment.isPublished && !(await canManageCourse(assignment.course.toString(), user))) {
        // Reported as missing rather than forbidden so unpublished work stays hidden.
        throw ApiError_1.ApiError.notFound('Assignment not found');
    }
    return assignment.populate(ASSIGNMENT_POPULATE);
};
exports.getAssignment = getAssignment;
const createAssignment = async (courseId, input, user, req) => {
    await loadEditableCourse(courseId, user);
    // A linked lesson must belong to this course, otherwise the curriculum tree
    // would point across course boundaries.
    if (input.lesson) {
        const lesson = await models_1.Lesson.findOne({
            _id: input.lesson,
            course: courseId,
            isDeleted: false,
        }).select('_id');
        if (!lesson)
            throw ApiError_1.ApiError.badRequest('Lesson does not belong to this course');
    }
    const assignment = await models_1.Assignment.create({ ...input, course: courseId });
    await (0, audit_service_1.recordAudit)({
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
exports.createAssignment = createAssignment;
const updateAssignment = async (assignmentId, input, user, req) => {
    const assignment = await models_1.Assignment.findById(assignmentId);
    if (!assignment)
        throw ApiError_1.ApiError.notFound('Assignment not found');
    await loadEditableCourse(assignment.course.toString(), user);
    if (input.lesson) {
        const lesson = await models_1.Lesson.findOne({
            _id: input.lesson,
            course: assignment.course,
            isDeleted: false,
        }).select('_id');
        if (!lesson)
            throw ApiError_1.ApiError.badRequest('Lesson does not belong to this course');
    }
    assignment.set(input);
    await assignment.save();
    await (0, audit_service_1.recordAudit)({
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
exports.updateAssignment = updateAssignment;
const deleteAssignment = async (assignmentId, user, req) => {
    const assignment = await models_1.Assignment.findById(assignmentId);
    if (!assignment)
        throw ApiError_1.ApiError.notFound('Assignment not found');
    await loadEditableCourse(assignment.course.toString(), user);
    // Refuse while work exists, so a learner never loses an already graded
    // submission. Unpublishing is the reversible alternative.
    const submitted = await models_1.Submission.exists({ assignment: assignment._id });
    if (submitted) {
        throw ApiError_1.ApiError.conflict('Learners have already submitted this assignment. Unpublish it instead of deleting it.');
    }
    await assignment.deleteOne();
    await (0, audit_service_1.recordAudit)({
        req,
        actorId: user.id,
        actorRole: user.roles[0],
        action: 'assignment.delete',
        entity: 'Assignment',
        entityId: assignmentId,
    });
    return { message: 'Assignment deleted' };
};
exports.deleteAssignment = deleteAssignment;
//# sourceMappingURL=assignment.service.js.map