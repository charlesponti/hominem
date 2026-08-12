import { createHash } from 'node:crypto';

const MAX_REQUESTS_PER_SEC = 5;
const WINDOW_SEC = 1;

function rateLimitKey(userId: string) {
  const identifier = createHash('sha256').update(userId).digest('hex').slice(0, 32);
  return `ratelimit:mcp:${identifier}`;
}

/**
 * Enforce the MCP request limit through the shared Redis instance so the limit
 * applies consistently across API processes and deployments.
 *
 * Cache failures are reported separately so the route can fail closed while
 * authentication and scope checks remain mandatory at the route boundary.
 */
export type RateLimitResult = 'allowed' | 'limited' | 'unavailable';

export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  try {
    const { redis } = await import('@hominem/services/redis');
    const count = await redis.incr(rateLimitKey(userId));
    if (count === 1) {
      await redis.expire(rateLimitKey(userId), WINDOW_SEC);
    }
    return count > MAX_REQUESTS_PER_SEC ? 'limited' : 'allowed';
  } catch {
    return 'unavailable';
  }
}
