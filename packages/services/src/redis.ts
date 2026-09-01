import { delay, TIME_UNITS } from '@hominem/utils';
import Redis from 'ioredis';

import { env } from './env.js';

const REDIS_URL = env.REDIS_URL;

export const redis = new Redis(REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  family: 0,
});

const MAX_REQUESTS = 50;

export async function checkRateLimit(key: string): Promise<boolean> {
  const now = Date.now();
  const windowStart = now - TIME_UNITS.MINUTE;

  await redis.zadd(key, now, now.toString());
  await redis.zremrangebyscore(key, 0, windowStart);

  const requestCount = await redis.zcard(key);
  return requestCount <= MAX_REQUESTS;
}

export async function waitForRateLimit(key: string) {
  while (!(await checkRateLimit(key))) {
    await delay(1000);
  }
}
