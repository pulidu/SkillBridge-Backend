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
exports.gradeSubmission = exports.listSubmissions = exports.listMySubmissions = exports.createSubmission = exports.revokeCertificate = exports.verifyCertificate = exports.listMyCertificates = exports.uncompleteLesson = exports.completeLesson = exports.getEnrollmentProgress = exports.getMyProgress = exports.cancelEnrollment = exports.updateEnrollment = exports.getEnrollment = exports.listEnrollments = exports.listMyEnrollments = exports.createEnrollment = void 0;
const enrollmentService = __importStar(require("../services/enrollment.service"));
const submissionService = __importStar(require("../services/submission.service"));
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const currentUser = (req) => req.user;
/* ------------------------------ enrollments -------------------------------- */
exports.createEnrollment = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const enrollment = await enrollmentService.createEnrollment(req.body, currentUser(req), req);
    return (0, response_1.sendSuccess)(res, enrollment, 201);
});
exports.listMyEnrollments = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const query = req.query;
    const result = await enrollmentService.listMyEnrollments(currentUser(req), {
        page: Number(query.page) || undefined,
        limit: Number(query.limit) || undefined,
        status: query.status,
    });
    return (0, response_1.sendSuccess)(res, result.items, 200, result.meta);
});
exports.listEnrollments = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const result = await enrollmentService.listEnrollments(req.query, currentUser(req));
    return (0, response_1.sendSuccess)(res, result.items, 200, result.meta);
});
exports.getEnrollment = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const enrollment = await enrollmentService.getEnrollmentById(req.params.id, currentUser(req));
    return (0, response_1.sendSuccess)(res, enrollment);
});
exports.updateEnrollment = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const enrollment = await enrollmentService.updateEnrollment(req.params.id, req.body, currentUser(req), req);
    return (0, response_1.sendSuccess)(res, enrollment);
});
exports.cancelEnrollment = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await enrollmentService.cancelEnrollment(req.params.id, currentUser(req), req);
    return (0, response_1.sendNoContent)(res);
});
/* -------------------------------- progress --------------------------------- */
exports.getMyProgress = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const progress = await enrollmentService.getMyProgress(currentUser(req));
    return (0, response_1.sendSuccess)(res, progress);
});
exports.getEnrollmentProgress = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const progress = await enrollmentService.getEnrollmentProgress(req.params.enrollmentId, currentUser(req));
    return (0, response_1.sendSuccess)(res, progress);
});
exports.completeLesson = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const result = await enrollmentService.completeLesson(req.params.lessonId, currentUser(req));
    return (0, response_1.sendSuccess)(res, result);
});
exports.uncompleteLesson = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const enrollment = await enrollmentService.uncompleteLesson(req.params.lessonId, currentUser(req));
    return (0, response_1.sendSuccess)(res, enrollment);
});
/* ----------------------------- certificates -------------------------------- */
exports.listMyCertificates = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const certificates = await enrollmentService.listMyCertificates(currentUser(req));
    return (0, response_1.sendSuccess)(res, certificates);
});
exports.verifyCertificate = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const certificate = await enrollmentService.verifyCertificate(req.params.serialNumber);
    return (0, response_1.sendSuccess)(res, certificate);
});
exports.revokeCertificate = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const certificate = await enrollmentService.revokeCertificate(req.params.id, currentUser(req));
    return (0, response_1.sendSuccess)(res, certificate);
});
/* ------------------------------ submissions -------------------------------- */
exports.createSubmission = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const submission = await submissionService.createSubmission(req.body, currentUser(req), req);
    return (0, response_1.sendSuccess)(res, submission, 201);
});
exports.listMySubmissions = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const query = req.query;
    const result = await submissionService.listMySubmissions(currentUser(req), {
        page: Number(query.page) || undefined,
        limit: Number(query.limit) || undefined,
        status: query.status,
    });
    return (0, response_1.sendSuccess)(res, result.items, 200, result.meta);
});
exports.listSubmissions = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const result = await submissionService.listSubmissions(req.query, currentUser(req));
    return (0, response_1.sendSuccess)(res, result.items, 200, result.meta);
});
exports.gradeSubmission = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const submission = await submissionService.gradeSubmission(req.params.id, req.body, currentUser(req), req);
    return (0, response_1.sendSuccess)(res, submission);
});
//# sourceMappingURL=enrollment.controller.js.map