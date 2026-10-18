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
exports.listInstructors = exports.getCurriculum = exports.deleteLesson = exports.updateLesson = exports.createLesson = exports.getLesson = exports.listLessons = exports.deleteModule = exports.updateModule = exports.createModule = exports.listModules = exports.deleteCategory = exports.updateCategory = exports.createCategory = exports.getCategoryBySlug = exports.getCategory = exports.listCategoriesWithCounts = exports.listCategories = void 0;
const courseService = __importStar(require("../services/course.service"));
const curriculumService = __importStar(require("../services/curriculum.service"));
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const currentUser = (req) => req.user;
/* ------------------------------- categories -------------------------------- */
exports.listCategories = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const categories = await curriculumService.listCategories();
    return (0, response_1.sendSuccess)(res, categories);
});
exports.listCategoriesWithCounts = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const categories = await courseService.listCategoriesWithCounts();
    return (0, response_1.sendSuccess)(res, categories);
});
exports.getCategory = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const category = await curriculumService.getCategory(req.params.id);
    return (0, response_1.sendSuccess)(res, category);
});
exports.getCategoryBySlug = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const category = await curriculumService.getCategoryBySlug(req.params.slug);
    return (0, response_1.sendSuccess)(res, category);
});
exports.createCategory = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const category = await curriculumService.createCategory(req.body, req);
    return (0, response_1.sendSuccess)(res, category, 201);
});
exports.updateCategory = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const category = await curriculumService.updateCategory(req.params.id, req.body, req);
    return (0, response_1.sendSuccess)(res, category);
});
exports.deleteCategory = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await curriculumService.deleteCategory(req.params.id, req);
    return (0, response_1.sendNoContent)(res);
});
/* --------------------------------- modules --------------------------------- */
exports.listModules = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const modules = await curriculumService.listModules(req.params.courseId, currentUser(req));
    return (0, response_1.sendSuccess)(res, modules);
});
exports.createModule = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const module = await curriculumService.createModule(req.params.courseId, req.body, currentUser(req), req);
    return (0, response_1.sendSuccess)(res, module, 201);
});
exports.updateModule = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const module = await curriculumService.updateModule(req.params.courseId, req.params.moduleId, req.body, currentUser(req), req);
    return (0, response_1.sendSuccess)(res, module);
});
exports.deleteModule = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await curriculumService.deleteModule(req.params.courseId, req.params.moduleId, currentUser(req), req);
    return (0, response_1.sendNoContent)(res);
});
/* --------------------------------- lessons --------------------------------- */
exports.listLessons = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const includeUnpublished = req.query
        .includeUnpublished === 'true';
    const lessons = await curriculumService.listLessons(req.params.courseId, currentUser(req), includeUnpublished);
    return (0, response_1.sendSuccess)(res, lessons);
});
exports.getLesson = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const lesson = await curriculumService.getLesson(req.params.courseId, req.params.lessonId, currentUser(req));
    return (0, response_1.sendSuccess)(res, lesson);
});
exports.createLesson = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const lesson = await curriculumService.createLesson(req.params.courseId, req.body, currentUser(req), req);
    return (0, response_1.sendSuccess)(res, lesson, 201);
});
exports.updateLesson = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const lesson = await curriculumService.updateLesson(req.params.courseId, req.params.lessonId, req.body, currentUser(req), req);
    return (0, response_1.sendSuccess)(res, lesson);
});
exports.deleteLesson = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await curriculumService.deleteLesson(req.params.courseId, req.params.lessonId, currentUser(req), req);
    return (0, response_1.sendNoContent)(res);
});
/* ------------------------------- curriculum -------------------------------- */
exports.getCurriculum = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const curriculum = await curriculumService.getCurriculum(req.params.courseId, currentUser(req));
    return (0, response_1.sendSuccess)(res, curriculum);
});
exports.listInstructors = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const instructors = await curriculumService.listInstructors();
    return (0, response_1.sendSuccess)(res, instructors);
});
//# sourceMappingURL=curriculum.controller.js.map