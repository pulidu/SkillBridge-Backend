import type { Server } from 'node:http';
import mongoose from 'mongoose';
import { app } from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { env } from './config/env';
import { logger } from './config/logger';

/**
 * Process entry point: connect to MongoDB, start listening, and shut down
 * cleanly on SIGINT/SIGTERM.
 */
const start = async (): Promise<void> => {
  await connectDatabase();

  const server: Server = app.listen(env.port, env.host, () => {
    logger.info(
      { port: env.port, host: env.host, env: env.nodeEnv },
      `SkillBridge LMS API listening on http://${env.host}:${env.port}/api/v1`,
    );
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Shutting down gracefully');

    server.close(async () => {
      try {
        await disconnectDatabase();
      } catch (error) {
        logger.error({ err: error }, 'Error while closing the database connection');
      }
      process.exit(0);
    });

    // Do not hang forever if a connection refuses to close.
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
  });

  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught exception, exiting');
    void mongoose.connection.close().finally(() => process.exit(1));
  });
};

start().catch((error) => {
  logger.fatal({ err: error }, 'Failed to start the server');
  process.exit(1);
});
