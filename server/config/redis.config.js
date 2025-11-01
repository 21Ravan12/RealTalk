import redis from 'redis';
import logger from '../utils/logger.js';

export const redisClient = redis.createClient({
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 5) {
        logger.error('Too many retries on REDIS. Connection Terminated');
        return new Error('Too many retries.');
      }
      return Math.min(retries * 100, 5000);
    },
  },
});

redisClient.on('error', (err) => {
  logger.error(`Redis error: ${err.message}`);
});

redisClient.on('connect', () => {
  logger.info('Connected to Redis');
});

export const connectRedis = async () => {
  await redisClient.connect();
  return redisClient;
};
