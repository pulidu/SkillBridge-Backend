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
Object.defineProperty(exports, "__esModule", { value: true });
exports.toUserResponse = exports.listInstructors = exports.getCurriculum = exports.deleteLesson = exports.updateLesson = exports.createLesson = exports.getLesson = exports.listLessons = exports.deleteModule = exports.updateModule = exports.createModule = exports.listModules = exports.deleteCategory = exports.updateCategory = exports.createCategory = exports.getCategoryBySlug = exports.getCategory = exports.listCategories = void 0;
const models_1 = require("../models");
Object.defineProperty(exports, "toUserResponse", { enumerable: true, get: function () { return models_1.toUserResponse; } });
const ApiError_1 = require("../utils/ApiError");
const slug_1 = require("../utils/slug");
const audit_service_1 = require("./audit.service");
const course_service_1 = require("./course.service");
/* -------------------------------------------------------------------------- */
/* Categories                                                                  */
/* -------------------------------------------------------------------------- */
const listCategories = async () => models_1.Category.find({ isActive: true, isDeleted: false }).sort({ name: 1 });
exports.listCategories = listCategories;
const getCategory = async (id) => {
    const category = await models_1.Category.findById(id);
    if (!category || category.isDeleted)
        throw ApiError_1.ApiError.notFound('Category not found');
    return category;
};
exports.getCategory = getCategory;
const getCategoryBySlug = async (slug) => {
    const category = await models_1.Category.findOne({ slug, isDeleted: false });
    if (!category)
        throw ApiError_1.ApiError.notFound('Category not found');
    return category;
};
exports.getCategoryBySlug = getCategoryBySlug;
const createCategory = async (input, req) => {
    const duplicate = await models_1.Category.findOne({ name: input.name });
    if (duplicate)
        throw ApiError_1.ApiError.conflict('A category with that name already exists');
    const slug = await (0, slug_1.uniqueSlug)(input.slug ?? input.name, async (candidate) => Boolean(await models_1.Category.exists({ slug: candidate })));
    const category = await models_1.Category.create({ ...input, slug });
    await (0, audit_service_1.recordAudit)({
        req,
        actorId: req.user?.id,
        actorRole: req.user?.roles[0],
        action: 'category.create',
        entity: 'Category',
        entityId: String(category._id),
    });
    return category;
};
exports.createCategory = createCategory;
const updateCategory = async (id, input, req) => {
    const update = { ...input };
    if (input.name) {
        const duplicate = await models_1.Category.findOne({ name: input.name, _id: { $ne: id } });
        if (duplicate)
            throw ApiError_1.ApiError.conflict('A category with that name already exists');
        update.slug = await (0, slug_1.uniqueSlug)(input.name, async (candidate) => Boolean(await models_1.Category.exists({ slug: candidate, _id: { $ne: id } })));
    }
    const category = await models_1.Category.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
    if (!category)
        throw ApiError_1.ApiError.notFound('Category not found');
    await (0, audit_service_1.recordAudit)({
        req,
        actorId: req.user?.id,
        actorRole: req.user?.roles[0],
        action: 'category.update',
        entity: 'Category',
        entityId: id,
    });
    return category;
};
exports.updateCategory = updateCategory;
const deleteCategory = async (id, req) => {
    const category = await models_1.Category.findById(id);
    if (!category || category.isDeleted)
        throw ApiError_1.ApiError.notFound('Category not found');
    const inUse = await models_1.Course.countDocuments({ category: id, isDeleted: false });
    if (inUse > 0) {
        throw ApiError_1.ApiError.badRequest(`Cannot delete a category that still has ${inUse} course(s)`);
    }
    category.isDeleted = true;
    category.isActive = false;
    await category.save();
    await (0, audit_service_1.recordAudit)({
        req,
        actorId: req.user?.id,
        actorRole: req.user?.roles[0],
        action: 'category.delete',
        entity: 'Category',
        entityId: id,
    });
};
exports.deleteCategory = deleteCategory;
/* -------------------------------------------------------------------------- */
/* Modules                                                                     */
/* -------------------------------------------------------------------------- */
const listModules = async (courseId, user) => {
    const course = await models_1.Course.findById(courseId);
    if (!course || course.isDeleted)
        throw ApiError_1.ApiError.notFound('Course not found');
    assertCourseReadAccess(course, user);
    const modules = await models_1.CourseModule.find({ course: courseId, isDeleted: false }).sort({
        position: 1,
        createdAt: 1,
    });
    const lessonCounts = await models_1.Lesson.aggregate([
        { $match: { course: courseId, isDeleted: false } },
        { $group: { _id: '$module', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(lessonCounts.map((entry) => [String(entry._id), entry.count]));
    return modules.map((module) => ({
        ...module.toJSON(),
        lessonCount: countMap.get(String(module._id)) ?? 0,
    }));
};
exports.listModules = listModules;
const createModule = async (courseId, input, user, req) => {
    const course = await models_1.Course.findById(courseId);
    if (!course || course.isDeleted)
        throw ApiError_1.ApiError.notFound('Course not found');
    (0, course_service_1.assertCourseOwnership)(course, user);
    const position = input.position ??
        ((await models_1.CourseModule.countDocuments({ course: courseId, isDeleted: false })) + 1);
    const module = await models_1.CourseModule.create({ ...input, course: courseId, position });
    await (0, audit_service_1.recordAudit)({
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
exports.createModule = createModule;
const updateModule = async (courseId, moduleId, input, user, req) => {
    const module = await models_1.CourseModule.findOne({ _id: moduleId, course: courseId, isDeleted: false });
    if (!module)
        throw ApiError_1.ApiError.notFound('Module not found');
    const course = await models_1.Course.findById(courseId);
    if (!course)
        throw ApiError_1.ApiError.notFound('Course not found');
    (0, course_service_1.assertCourseOwnership)(course, user);
    Object.assign(module, input);
    await module.save();
    await (0, audit_service_1.recordAudit)({
        req,
        actorId: user.id,
        actorRole: user.roles[0],
        action: 'module.update',
        entity: 'Module',
        entityId: moduleId,
    });
    return module;
};
exports.updateModule = updateModule;
const deleteModule = async (courseId, moduleId, user, req) => {
    const module = await models_1.CourseModule.findOne({ _id: moduleId, course: courseId, isDeleted: false });
    if (!module)
        throw ApiError_1.ApiError.notFound('Module not found');
    const course = await models_1.Course.findById(courseId);
    if (!course)
        throw ApiError_1.ApiError.notFound('Course not found');
    (0, course_service_1.assertCourseOwnership)(course, user);
    await models_1.CourseModule.findByIdAndUpdate(moduleId, { $set: { isDeleted: true } });
    await models_1.Lesson.updateMany({ course: courseId, module: moduleId }, { $set: { isDeleted: true } });
    await (0, course_service_1.recalculateCourseStats)(courseId);
    await (0, audit_service_1.recordAudit)({
        req,
        actorId: user.id,
        actorRole: user.roles[0],
        action: 'module.delete',
        entity: 'Module',
        entityId: moduleId,
        meta: { course: courseId },
    });
};
exports.deleteModule = deleteModule;
/* -------------------------------------------------------------------------- */
/* Lessons                                                                     */
/* -------------------------------------------------------------------------- */
const listLessons = async (courseId, user, includeUnpublished = false) => {
    const course = await models_1.Course.findById(courseId);
    if (!course || course.isDeleted)
        throw ApiError_1.ApiError.notFound('Course not found');
    const isOwner = user.roles.includes('admin') || course.instructor.toString() === user.id;
    if (!isOwner)
        assertCourseReadAccess(course, user);
    const filter = { course: courseId, isDeleted: false };
    if (!isOwner || !includeUnpublished)
        filter.isPublished = true;
    return models_1.Lesson.find(filter).sort({ position: 1, createdAt: 1 });
};
exports.listLessons = listLessons;
const getLesson = async (courseId, lessonId, user) => {
    const course = await models_1.Course.findById(courseId);
    if (!course || course.isDeleted)
        throw ApiError_1.ApiError.notFound('Course not found');
    const lesson = await models_1.Lesson.findOne({ _id: lessonId, course: courseId, isDeleted: false });
    if (!lesson)
        throw ApiError_1.ApiError.notFound('Lesson not found');
    const isOwner = user.roles.includes('admin') || course.instructor.toString() === user.id;
    if (isOwner)
        return lesson;
    // Everyone else must be enrolled, unless the lesson is a free preview.
    if (!lesson.isPublished && !lesson.isPreview) {
        throw ApiError_1.ApiError.forbidden('This lesson is not available');
    }
    if (course.status !== 'published' && !lesson.isPreview) {
        throw ApiError_1.ApiError.forbidden('This course is not published');
    }
    const { Enrollment } = await Promise.resolve().then(() => __importStar(require('../models')));
    const enrolled = await Enrollment.exists({
        course: courseId,
        student: user.id,
        status: { $in: ['active', 'completed'] },
    });
    if (!enrolled && !lesson.isPreview) {
        throw ApiError_1.ApiError.forbidden('Enrol in this course to view the lesson');
    }
    return lesson;
};
exports.getLesson = getLesson;
const createLesson = async (courseId, input, user, req) => {
    const course = await models_1.Course.findById(courseId);
    if (!course || course.isDeleted)
        throw ApiError_1.ApiError.notFound('Course not found');
    (0, course_service_1.assertCourseOwnership)(course, user);
    if (input.module) {
        const parent = await models_1.CourseModule.findOne({ _id: input.module, course: courseId, isDeleted: false });
        if (!parent)
            throw ApiError_1.ApiError.notFound('Module not found in this course');
    }
    const position = input.position ??
        ((await models_1.Lesson.countDocuments({ course: courseId, isDeleted: false })) + 1);
    const lesson = await models_1.Lesson.create({ ...input, course: courseId, position });
    await (0, course_service_1.recalculateCourseStats)(courseId);
    await (0, audit_service_1.recordAudit)({
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
exports.createLesson = createLesson;
const updateLesson = async (courseId, lessonId, input, user, req) => {
    const lesson = await models_1.Lesson.findOne({ _id: lessonId, course: courseId, isDeleted: false });
    if (!lesson)
        throw ApiError_1.ApiError.notFound('Lesson not found');
    const course = await models_1.Course.findById(courseId);
    if (!course)
        throw ApiError_1.ApiError.notFound('Course not found');
    (0, course_service_1.assertCourseOwnership)(course, user);
    if (input.module) {
        const parent = await models_1.CourseModule.findOne({ _id: input.module, course: courseId, isDeleted: false });
        if (!parent)
            throw ApiError_1.ApiError.notFound('Module not found in this course');
    }
    Object.assign(lesson, input);
    await lesson.save();
    await (0, course_service_1.recalculateCourseStats)(courseId);
    await (0, audit_service_1.recordAudit)({
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
exports.updateLesson = updateLesson;
const deleteLesson = async (courseId, lessonId, user, req) => {
    const lesson = await models_1.Lesson.findOne({ _id: lessonId, course: courseId, isDeleted: false });
    if (!lesson)
        throw ApiError_1.ApiError.notFound('Lesson not found');
    const course = await models_1.Course.findById(courseId);
    if (!course)
        throw ApiError_1.ApiError.notFound('Course not found');
    (0, course_service_1.assertCourseOwnership)(course, user);
    await models_1.Lesson.findByIdAndUpdate(lessonId, { $set: { isDeleted: true } });
    await (0, course_service_1.recalculateCourseStats)(courseId);
    await (0, audit_service_1.recordAudit)({
        req,
        actorId: user.id,
        actorRole: user.roles[0],
        action: 'lesson.delete',
        entity: 'Lesson',
        entityId: lessonId,
    });
};
exports.deleteLesson = deleteLesson;
/** Nested module + lesson tree used by the course detail page. */
const getCurriculum = async (courseId, user) => {
    const course = await models_1.Course.findById(courseId);
    if (!course || course.isDeleted)
        throw ApiError_1.ApiError.notFound('Course not found');
    const isOwner = user.roles.includes('admin') || course.instructor.toString() === user.id;
    if (!isOwner)
        assertCourseReadAccess(course, user);
    const moduleFilter = { course: courseId, isDeleted: false };
    const lessonFilter = { course: courseId, isDeleted: false };
    if (!isOwner)
        lessonFilter.isPublished = true;
    const [modules, lessons] = await Promise.all([
        models_1.CourseModule.find(moduleFilter).sort({ position: 1, createdAt: 1 }),
        models_1.Lesson.find(lessonFilter).sort({ position: 1, createdAt: 1 }),
    ]);
    return { modules, lessons };
};
exports.getCurriculum = getCurriculum;
/**
 * Read access: admins and the owner see everything; everyone else may only
 * read a published course.
 */
const assertCourseReadAccess = (course, user) => {
    if (user.roles.includes('admin'))
        return;
    if (course.instructor.toString() === user.id)
        return;
    if (course.status !== 'published')
        throw ApiError_1.ApiError.notFound('Course not found');
};
const listInstructors = async () => models_1.User.find({ roles: 'instructor', isDeleted: false, status: 'active' })
    .select('fullName avatarUrl bio')
    .sort({ fullName: 1 });
exports.listInstructors = listInstructors;
//# sourceMappingURL=curriculum.service.js.map