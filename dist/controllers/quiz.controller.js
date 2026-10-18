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
exports.listAllAttempts = exports.listMyAttempts = exports.submitAttempt = exports.deleteQuiz = exports.updateQuiz = exports.getQuiz = exports.createQuiz = exports.listCourseQuizzes = void 0;
const quizService = __importStar(require("../services/quiz.service"));
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const currentUser = (req) => req.user;
exports.listCourseQuizzes = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const quizzes = await quizService.listCourseQuizzes(req.params.courseId, currentUser(req));
    return (0, response_1.sendSuccess)(res, quizzes);
});
exports.createQuiz = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const quiz = await quizService.createQuiz(req.params.courseId, req.body, currentUser(req), req);
    return (0, response_1.sendSuccess)(res, quiz, 201);
});
exports.getQuiz = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const quiz = await quizService.getQuiz(req.params.id, currentUser(req));
    return (0, response_1.sendSuccess)(res, quiz);
});
exports.updateQuiz = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const quiz = await quizService.updateQuiz(req.params.id, req.body, currentUser(req), req);
    return (0, response_1.sendSuccess)(res, quiz);
});
exports.deleteQuiz = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await quizService.deleteQuiz(req.params.id, currentUser(req), req);
    return (0, response_1.sendNoContent)(res);
});
exports.submitAttempt = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const result = await quizService.submitAttempt(req.params.id, req.body, currentUser(req));
    return (0, response_1.sendSuccess)(res, result, 201);
});
exports.listMyAttempts = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const attempts = await quizService.listMyAttempts(req.params.id, currentUser(req));
    return (0, response_1.sendSuccess)(res, attempts);
});
exports.listAllAttempts = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const query = req.query;
    const result = await quizService.listAllAttempts(req.params.id, currentUser(req), {
        page: Number(query.page) || undefined,
        limit: Number(query.limit) || undefined,
        passed: query.passed === undefined ? undefined : query.passed === 'true',
    });
    return (0, response_1.sendSuccess)(res, result.items, 200, result.meta);
});
//# sourceMappingURL=quiz.controller.js.map