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
exports.getMyProfile = exports.deleteUser = exports.updateUserStatus = exports.updateUserRole = exports.updateUser = exports.createUser = exports.getUser = exports.listUsers = void 0;
const userService = __importStar(require("../services/user.service"));
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const currentUser = (req) => req.user;
/* ----------------------------- admin: all users ---------------------------- */
exports.listUsers = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const result = await userService.listUsers(req.query);
    return (0, response_1.sendSuccess)(res, result.items, 200, result.meta);
});
exports.getUser = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = await userService.getUserById(req.params.id);
    return (0, response_1.sendSuccess)(res, user);
});
exports.createUser = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = await userService.createUser(req.body, req);
    return (0, response_1.sendCreated)(res, user);
});
exports.updateUser = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = await userService.updateUser(req.params.id, req.body, req);
    return (0, response_1.sendSuccess)(res, user);
});
exports.updateUserRole = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { role } = req.body;
    const user = await userService.updateUserRole(req.params.id, role, req);
    return (0, response_1.sendSuccess)(res, user);
});
exports.updateUserStatus = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { status } = req.body;
    const user = await userService.updateUserStatus(req.params.id, status, req);
    return (0, response_1.sendSuccess)(res, user);
});
exports.deleteUser = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await userService.deleteUser(req.params.id, req);
    return (0, response_1.sendNoContent)(res);
});
/* ------------------------- any authenticated user -------------------------- */
exports.getMyProfile = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = await userService.getUserById(currentUser(req).id);
    return (0, response_1.sendSuccess)(res, user);
});
//# sourceMappingURL=user.controller.js.map