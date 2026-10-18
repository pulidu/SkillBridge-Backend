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
exports.auditService = exports.dashboardService = exports.notificationListService = exports.notificationService = exports.submissionService = exports.enrollmentService = exports.quizService = exports.assignmentService = exports.curriculumService = exports.courseService = exports.userService = exports.authService = void 0;
/**
 * Barrel export for the service layer.
 */
exports.authService = __importStar(require("./auth.service"));
exports.userService = __importStar(require("./user.service"));
exports.courseService = __importStar(require("./course.service"));
exports.curriculumService = __importStar(require("./curriculum.service"));
exports.assignmentService = __importStar(require("./assignment.service"));
exports.quizService = __importStar(require("./quiz.service"));
exports.enrollmentService = __importStar(require("./enrollment.service"));
exports.submissionService = __importStar(require("./submission.service"));
exports.notificationService = __importStar(require("./notification.service"));
exports.notificationListService = __importStar(require("./notification-list.service"));
exports.dashboardService = __importStar(require("./dashboard.service"));
exports.auditService = __importStar(require("./audit.service"));
//# sourceMappingURL=index.js.map