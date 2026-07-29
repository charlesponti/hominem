import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  incr: vi.fn(),
  expire: vi.fn(),
}));

vi.mock('@hominem/services/redis', () => ({
  redis: mocks,
}));

import { isRateLimited } from './rate-limiter';

describe('rate limiter', () => {
  beforeEach(() => {
    mocks.incr.mockReset();
    mocks.expire.mockReset();
  });

  it('allows the first five requests', async () => {
    mocks.incr.mockResolvedValueOnce(1).mockResolvedValueOnce(2).mockResolvedValueOnce(3);
    mocks.incr.mockResolvedValueOnce(4).mockResolvedValueOnce(5);

    await expect(isRateLimited('user-1')).resolves.toBe(false);
    await expect(isRateLimited('user-1')).resolves.toBe(false);
    await expect(isRateLimited('user-1')).resolves.toBe(false);
    await expect(isRateLimited('user-1')).resolves.toBe(false);
    await expect(isRateLimited('user-1')).resolves.toBe(false);
    expect(mocks.expire).toHaveBeenCalledOnce();
  });

  it('blocks the sixth request in the window', async () => {
    mocks.incr.mockResolvedValue(6);

    await expect(isRateLimited('user-1')).resolves.toBe(true);
    expect(mocks.expire).not.toHaveBeenCalled();
  });

  it('uses a separate hashed Redis key per user', async () => {
    mocks.incr.mockResolvedValue(1);

    await isRateLimited('user-1');
    await isRateLimited('user-2');

    expect(mocks.incr.mock.calls[0]?.[0]).not.toBe(mocks.incr.mock.calls[1]?.[0]);
    expect(mocks.incr.mock.calls[0]?.[0]).toMatch(/^ratelimit:mcp:[a-f0-9]{32}$/);
  });

  it('fails open when Redis is unavailable', async () => {
    mocks.incr.mockRejectedValue(new Error('redis unavailable'));

    await expect(isRateLimited('user-1')).resolves.toBe(false);
  });
});
