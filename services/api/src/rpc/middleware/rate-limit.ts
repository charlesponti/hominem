import { createHash } from 'node:crypto';

import { createMiddleware } from 'hono/factory';

import { getRedis } from '../../redis';
import type { AppContext } from './auth';

interface RateLimitInput {
  bucket: string;
  // Number of seconds the value will remain cached in Redis.
  windowSec: number;
  max: number;
}

function hashRateLimitIdentifier(value: string) {
  return createHash('sha256').update(value).digest('hex').slice(0, 32);
}

export function rateLimitMiddleware(input: RateLimitInput) {
  return createMiddleware<AppContext>(async (c, next) => {
    try {
      const redis = await getRedis();
      const userId = c.get('auth')?.userId ?? 'anonymous';
      const key = `ratelimit:rpc:${input.bucket}:${hashRateLimitIdentifier(`${userId}:${input.bucket}`)}`;
      const count = await redis.incr(key);

      if (count === 1) {
        await redis.expire(key, input.windowSec);
      }

      c.header('X-RateLimit-Limit', String(input.max));
      c.header('X-RateLimit-Remaining', String(Math.max(0, input.max - count)));

      if (count > input.max) {
        return c.json(
          {
            error: 'rate_limit_exceeded',
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Rate limit exceeded. Retry later.',
          },
          429,
        );
      }
    } catch {
      // Fail open on cache failures to preserve availability.
    }

    return next();
  });
}
