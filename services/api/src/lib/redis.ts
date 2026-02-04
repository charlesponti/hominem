import { redis } from '@hominem/services/redis';
import { logger } from '@hominem/utils/logger';

// Set up Redis event handlers once
redis.on('error', (err) => {
  logger.error('Redis client error:', err);
});

redis.on('connect', () => {
  logger.info('Redis client connected');
});

redis.on('ready', () => {
  logger.info('Redis client ready');
});

// Just export the Redis instance directly
export { redis as cache };
