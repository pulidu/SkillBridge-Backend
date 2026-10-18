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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.app = exports.createApp = void 0;
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const compression_1 = __importDefault(require("compression"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const pino_http_1 = __importDefault(require("pino-http"));
const cors_2 = require("./config/cors");
const env_1 = require("./config/env");
const logger_1 = require("./config/logger");
Object.defineProperty(exports, "logger", { enumerable: true, get: function () { return logger_1.logger; } });
const error_middleware_1 = require("./middleware/error.middleware");
const rateLimit_middleware_1 = require("./middleware/rateLimit.middleware");
const routes_1 = __importDefault(require("./routes"));
const assignment_routes_1 = __importDefault(require("./routes/assignment.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const categories_routes_1 = __importDefault(require("./routes/categories.routes"));
const courses_routes_1 = __importDefault(require("./routes/courses.routes"));
const course_assignment_routes_1 = __importDefault(require("./routes/course-assignment.routes"));
const curriculum_routes_1 = __importDefault(require("./routes/curriculum.routes"));
const enrollments_routes_1 = __importStar(require("./routes/enrollments.routes"));
const quizzes_routes_1 = __importStar(require("./routes/quizzes.routes"));
const submissions_routes_1 = __importDefault(require("./routes/submissions.routes"));
const users_routes_1 = __importDefault(require("./routes/users.routes"));
const study_task_routes_1 = __importDefault(require("./routes/study-task.routes"));
/**
 * Assembles the Express application. Kept separate from `server.ts` so tests
 * can import the app without opening a listening socket.
 */
const createApp = () => {
    const app = (0, express_1.default)();
    // Trust the first reverse proxy hop so `req.ip` is meaningful behind nginx.
    app.set('trust proxy', 1);
    app.disable('x-powered-by');
    /* ----------------------------- security + perf --------------------------- */
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'https:'],
                connectSrc: ["'self'", ...env_1.env.corsOrigins],
            },
        },
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    }));
    app.use((0, cors_1.default)(cors_2.corsOptions));
    app.use((0, compression_1.default)());
    app.use(express_1.default.json({ limit: '1mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '1mb' }));
    app.use((0, cookie_parser_1.default)());
    app.use((0, pino_http_1.default)(logger_1.loggerConfig));
    /* ------------------------------- API routes ------------------------------ */
    app.use('/api/v1', rateLimit_middleware_1.apiLimiter, routes_1.default);
    app.use('/api/v1/auth', auth_routes_1.default);
    app.use('/api/v1/users', users_routes_1.default);
    app.use('/api/v1/categories', categories_routes_1.default);
    app.use('/api/v1/courses', courses_routes_1.default);
    app.use('/api/v1/courses', curriculum_routes_1.default);
    app.use('/api/v1/courses', quizzes_routes_1.courseQuizRouter);
    app.use('/api/v1/assignments', assignment_routes_1.default);
    app.use('/api/v1/courses', course_assignment_routes_1.default);
    app.use('/api/v1/quizzes', quizzes_routes_1.default);
    app.use('/api/v1/enrollments', enrollments_routes_1.default);
    app.use('/api/v1/progress', enrollments_routes_1.progressRouter);
    app.use('/api/v1/submissions', submissions_routes_1.default);
    app.use('/api/v1/planner', study_task_routes_1.default);
    /* -------------------------------- root probe ----------------------------- */
    app.get('/', (_req, res) => {
        res.json({
            success: true,
            data: {
                name: 'SkillBridge LMS API',
                version: '1.0.0',
                docs: '/api/v1/health',
            },
        });
    });
    /* ------------------------------ error handling --------------------------- */
    // Order matters: unmatched routes first, then the terminal error handler.
    app.use(error_middleware_1.notFound);
    app.use(error_middleware_1.errorHandler);
    return app;
};
exports.createApp = createApp;
exports.app = (0, exports.createApp)();
//# sourceMappingURL=app.js.map