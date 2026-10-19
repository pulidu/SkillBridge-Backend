import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';
import { ApiError } from '../utils/ApiError';

mongoose.set('strictQuery', true);
mongoose.set('sanitizeFilter', true);

let cachedPromise: Promise<typeof mongoose> | null = null;

export const connectDatabase = async (): Promise<typeof mongoose> => {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (cachedPromise) {
    return cachedPromise;
  }

  if (!env.mongoUri || env.mongoUri.includes('127.0.0.1') && env.isProduction) {
    logger.warn('MongoDB URI is not configured or pointing to localhost in production');
    throw new ApiError(503, 'Database service is currently unavailable. Please verify MONGODB_URI in Vercel environment variables.');
  }

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
    cachedPromise = mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 5_000,
      autoIndex: !env.isProduction,
    });
    return await cachedPromise;
  } catch (error) {
    cachedPromise = null;
    logger.error({ err: error }, 'Failed to connect to MongoDB');
    throw new ApiError(503, 'Database connection failed. Please verify MONGODB_URI configuration.');
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
