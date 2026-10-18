import cookieParser from 'cookie-parser';
import cors from 'cors';
import compression from 'compression';
import express, { type Application, type Request, type Response } from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { connectDatabase } from './config/database';
import { corsOptions } from './config/cors';
import { env } from './config/env';
import { logger, loggerConfig } from './config/logger';
import { errorHandler, notFound } from './middleware/error.middleware';
import { apiLimiter } from './middleware/rateLimit.middleware';
import apiRouter from './routes';
import assignmentRoutes from './routes/assignment.routes';
import authRoutes from './routes/auth.routes';
import categoriesRoutes from './routes/categories.routes';
import courseRoutes from './routes/courses.routes';
import courseAssignmentRoutes from './routes/course-assignment.routes';
import curriculumRoutes from './routes/curriculum.routes';
import enrollmentsRoutes, { progressRouter } from './routes/enrollments.routes';
import quizRoutes, { courseQuizRouter } from './routes/quizzes.routes';
import submissionsRoutes from './routes/submissions.routes';
import userRoutes from './routes/users.routes';
import studyTaskRoutes from './routes/study-task.routes';

/**
 * Assembles the Express application. Kept separate from `server.ts` so tests
 * can import the app without opening a listening socket.
 */
export const createApp = (): Application => {
  const app = express();

  // Trust the first reverse proxy hop so `req.ip` is meaningful behind nginx.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  /* ----------------------------- security + perf --------------------------- */
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", ...env.corsOrigins],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cors(corsOptions));
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(pinoHttp(loggerConfig));

  /* ------------------------------- DB connect ------------------------------ */
  app.use(async (_req, _res, next) => {
    try {
      await connectDatabase();
      next();
    } catch (error) {
      next(error);
    }
  });

  /* ------------------------------- API routes ------------------------------ */
  app.use('/api/v1', apiLimiter, apiRouter);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/categories', categoriesRoutes);
  app.use('/api/v1/courses', courseRoutes);
  app.use('/api/v1/courses', curriculumRoutes);
  app.use('/api/v1/courses', courseQuizRouter);
app.use('/api/v1/assignments', assignmentRoutes);
app.use('/api/v1/courses', courseAssignmentRoutes);
  app.use('/api/v1/quizzes', quizRoutes);
  app.use('/api/v1/enrollments', enrollmentsRoutes);
  app.use('/api/v1/progress', progressRouter);
  app.use('/api/v1/submissions', submissionsRoutes);
  app.use('/api/v1/planner', studyTaskRoutes);

  /* -------------------------------- root probe ----------------------------- */
  app.get('/', (_req: Request, res: Response) => {
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
  app.use(notFound);
  app.use(errorHandler);

  return app;
};

export const app = createApp();

export { logger };
