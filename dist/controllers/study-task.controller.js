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
exports.getInstructorPlannerStats = exports.getAdminPlannerStats = exports.getStudentPlannerStats = exports.getWeeklySchedule = exports.generateSuggestions = exports.deleteTask = exports.updateTask = exports.getTaskById = exports.createTask = exports.listTasks = void 0;
const studyTaskService = __importStar(require("../services/study-task.service"));
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const currentUser = (req) => req.user;
exports.listTasks = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const tasks = await studyTaskService.listTasks(currentUser(req), req.query);
    return (0, response_1.sendSuccess)(res, tasks);
});
exports.createTask = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const task = await studyTaskService.createTask(currentUser(req), req.body);
    return (0, response_1.sendCreated)(res, task);
});
exports.getTaskById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const task = await studyTaskService.getTaskById(req.params.id, currentUser(req));
    return (0, response_1.sendSuccess)(res, task);
});
exports.updateTask = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const task = await studyTaskService.updateTask(req.params.id, currentUser(req), req.body);
    return (0, response_1.sendSuccess)(res, task);
});
exports.deleteTask = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await studyTaskService.deleteTask(req.params.id, currentUser(req));
    return (0, response_1.sendNoContent)(res);
});
exports.generateSuggestions = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const result = await studyTaskService.generateSuggestions(currentUser(req));
    return (0, response_1.sendSuccess)(res, result);
});
exports.getWeeklySchedule = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const schedule = await studyTaskService.getWeeklySchedule(currentUser(req), req.query.weekStart);
    return (0, response_1.sendSuccess)(res, schedule);
});
exports.getStudentPlannerStats = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const stats = await studyTaskService.getStudentPlannerStats(currentUser(req));
    return (0, response_1.sendSuccess)(res, stats);
});
exports.getAdminPlannerStats = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const stats = await studyTaskService.getAdminPlannerStats();
    return (0, response_1.sendSuccess)(res, stats);
});
exports.getInstructorPlannerStats = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const stats = await studyTaskService.getInstructorPlannerStats(currentUser(req));
    return (0, response_1.sendSuccess)(res, stats);
});
//# sourceMappingURL=study-task.controller.js.map