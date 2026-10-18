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
exports.notifyEnrolledStudents = exports.createNotification = void 0;
const models_1 = require("../models");
/** Creates one in-app notification. Callers fire this without awaiting. */
const createNotification = async (input) => {
    await models_1.Notification.create({
        user: input.user,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link,
    });
};
exports.createNotification = createNotification;
/** Best-effort broadcast used after a course is published. */
const notifyEnrolledStudents = async (courseId, payload) => {
    const { Enrollment } = await Promise.resolve().then(() => __importStar(require('../models')));
    const enrollments = await Enrollment.find({ course: courseId, status: 'active' })
        .select('student')
        .lean();
    if (enrollments.length === 0)
        return;
    await models_1.Notification.insertMany(enrollments.map((enrollment) => ({ user: enrollment.student, ...payload })));
};
exports.notifyEnrolledStudents = notifyEnrolledStudents;
//# sourceMappingURL=notification.service.js.map