import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

mongoose.set('strictQuery', true);
mongoose.set('sanitizeFilter', true);

export const connectDatabase = async (): Promise<typeof mongoose> => {
  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connected');
  });

  mongoose.connection.on('error', (error) => {
    logger.error({ err: error }, 'MongoDB connection error');
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  try {
    return await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 10_000,
      autoIndex: !env.isProduction,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to connect to MongoDB');
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed');
};

export const databaseHealth = async (): Promise<{
  connected: boolean;
  readyState: number;
}> => {
  const readyState = mongoose.connection.readyState;
  return { connected: readyState === 1, readyState };
};
