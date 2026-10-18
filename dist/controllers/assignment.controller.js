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
exports.deleteAssignment = exports.updateAssignment = exports.createAssignment = exports.getAssignment = exports.listAssignments = void 0;
const assignmentService = __importStar(require("../services/assignment.service"));
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const currentUser = (req) => req.user;
/**
 * HTTP layer for assignments. All authorisation decisions live in the service,
 * so these handlers only translate between Express and the service functions.
 */
exports.listAssignments = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const assignments = await assignmentService.listAssignments(req.params.courseId, req.query.includeUnpublished === 'true', currentUser(req));
    return (0, response_1.sendSuccess)(res, assignments);
});
exports.getAssignment = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const assignment = await assignmentService.getAssignment(req.params.assignmentId, currentUser(req));
    return (0, response_1.sendSuccess)(res, assignment);
});
exports.createAssignment = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const assignment = await assignmentService.createAssignment(req.params.courseId, req.body, currentUser(req), req);
    return (0, response_1.sendCreated)(res, assignment);
});
exports.updateAssignment = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const assignment = await assignmentService.updateAssignment(req.params.assignmentId, req.body, currentUser(req), req);
    return (0, response_1.sendSuccess)(res, assignment);
});
exports.deleteAssignment = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await assignmentService.deleteAssignment(req.params.assignmentId, currentUser(req), req);
    return (0, response_1.sendNoContent)(res);
});
//# sourceMappingURL=assignment.controller.js.map