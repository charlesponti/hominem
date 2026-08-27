import { createHash } from 'node:crypto';

const MAX_REQUESTS_PER_SEC = 5;
const WINDOW_SEC = 1;
const INCREMENT_SCRIPT = `
  local count = redis.call('INCR', KEYS[1])
  if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
  return count
`;

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
    const count = Number(
      await redis.eval(INCREMENT_SCRIPT, 1, rateLimitKey(userId), String(WINDOW_SEC)),
    );
    return count > MAX_REQUESTS_PER_SEC ? 'limited' : 'allowed';
  } catch {
    return 'unavailable';
  }
}
