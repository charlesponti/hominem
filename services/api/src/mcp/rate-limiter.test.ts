import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  eval: vi.fn(),
}));

vi.mock('@hominem/services/redis', () => ({
  redis: mocks,
}));

import { checkRateLimit } from './rate-limiter';

describe('rate limiter', () => {
  beforeEach(() => {
    mocks.eval.mockReset();
  });

  it('allows the first five requests', async () => {
    mocks.eval
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(5);

    await expect(checkRateLimit('user-1')).resolves.toBe('allowed');
    await expect(checkRateLimit('user-1')).resolves.toBe('allowed');
    await expect(checkRateLimit('user-1')).resolves.toBe('allowed');
    await expect(checkRateLimit('user-1')).resolves.toBe('allowed');
    await expect(checkRateLimit('user-1')).resolves.toBe('allowed');
    expect(mocks.eval).toHaveBeenCalledTimes(5);
  });

  it('blocks the sixth request in the window', async () => {
    mocks.eval.mockResolvedValue(6);

    await expect(checkRateLimit('user-1')).resolves.toBe('limited');
  });

  it('uses a separate hashed Redis key per user', async () => {
    mocks.eval.mockResolvedValue(1);

    await checkRateLimit('user-1');
    await checkRateLimit('user-2');

    expect(mocks.eval.mock.calls[0]?.[2]).not.toBe(mocks.eval.mock.calls[1]?.[2]);
    expect(mocks.eval.mock.calls[0]?.[2]).toMatch(/^ratelimit:mcp:[a-f0-9]{32}$/);
  });

  it('increments and sets the one-second TTL atomically', async () => {
    mocks.eval.mockResolvedValue(1);

    await checkRateLimit('user-1');

    expect(mocks.eval).toHaveBeenCalledWith(
      expect.stringContaining('redis.call'),
      1,
      expect.stringMatching(/^ratelimit:mcp:[a-f0-9]{32}$/),
      '1',
    );
  });

  it('reports unavailable when Redis is unavailable', async () => {
    mocks.eval.mockRejectedValue(new Error('redis unavailable'));

    await expect(checkRateLimit('user-1')).resolves.toBe('unavailable');
  });
});
