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
exports.listCourseRatings = exports.rateCourse = exports.getCourseStudents = exports.getCourseAnalytics = exports.archiveCourse = exports.unpublishCourse = exports.publishCourse = exports.deleteCourse = exports.assignCourseInstructor = exports.updateCourse = exports.createCourse = exports.getCourseBySlug = exports.getCourse = exports.listFeaturedCourses = exports.listCourses = void 0;
const courseService = __importStar(require("../services/course.service"));
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const currentUser = (req) => req.user;
exports.listCourses = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const result = await courseService.listCourses(req.query, req.user);
    return (0, response_1.sendSuccess)(res, result.items, 200, result.meta);
});
exports.listFeaturedCourses = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const courses = await courseService.listFeaturedCourses();
    return (0, response_1.sendSuccess)(res, courses);
});
exports.getCourse = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const course = await courseService.getCourseById(req.params.id, req.user);
    return (0, response_1.sendSuccess)(res, course);
});
exports.getCourseBySlug = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const course = await courseService.getCourseBySlug(req.params.slug, req.user);
    return (0, response_1.sendSuccess)(res, course);
});
exports.createCourse = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const course = await courseService.createCourse(req.body, currentUser(req), req);
    return (0, response_1.sendSuccess)(res, course, 201);
});
exports.updateCourse = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const course = await courseService.updateCourse(req.params.id, req.body, currentUser(req), req);
    return (0, response_1.sendSuccess)(res, course);
});
exports.assignCourseInstructor = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { instructor } = req.body;
    const course = await courseService.assignCourseInstructor(req.params.id, instructor, currentUser(req), req);
    return (0, response_1.sendSuccess)(res, course);
});
exports.deleteCourse = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await courseService.deleteCourse(req.params.id, currentUser(req), req);
    return (0, response_1.sendNoContent)(res);
});
exports.publishCourse = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const course = await courseService.setCourseStatus(req.params.id, 'published', currentUser(req), req);
    return (0, response_1.sendSuccess)(res, course);
});
exports.unpublishCourse = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const course = await courseService.setCourseStatus(req.params.id, 'draft', currentUser(req), req);
    return (0, response_1.sendSuccess)(res, course);
});
exports.archiveCourse = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const course = await courseService.setCourseStatus(req.params.id, 'archived', currentUser(req), req);
    return (0, response_1.sendSuccess)(res, course);
});
exports.getCourseAnalytics = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const analytics = await courseService.getCourseAnalytics(req.params.id, currentUser(req));
    return (0, response_1.sendSuccess)(res, analytics);
});
exports.getCourseStudents = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const result = await courseService.listCourseStudents(req.params.id, currentUser(req), {
        page: Number(req.query.page) || undefined,
        limit: Number(req.query.limit) || undefined,
        status: req.query.status,
        search: req.query.search,
    });
    return (0, response_1.sendSuccess)(res, result.items, 200, result.meta);
});
exports.rateCourse = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const rating = await courseService.rateCourse(req.params.id, req.body, currentUser(req));
    return (0, response_1.sendSuccess)(res, rating, 201);
});
exports.listCourseRatings = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const query = req.query;
    const result = await courseService.listCourseRatings(req.params.id, Number(query.page) || 1, Number(query.limit) || 20);
    return (0, response_1.sendSuccess)(res, result.items, 200, result.meta);
});
//# sourceMappingURL=course.controller.js.map