import { describe, expect, it, vi } from 'vitest';

import { AsyncEventQueue } from './chat-generation.service';

describe('AsyncEventQueue', () => {
  it('runs its cleanup hook when a consumer stops early', async () => {
    const onReturn = vi.fn();
    const queue = new AsyncEventQueue<number>(onReturn);
    const iterator = queue[Symbol.asyncIterator]();
    const pending = iterator.next();

    await iterator.return?.();

    await expect(pending).resolves.toEqual({ value: undefined, done: true });
    expect(onReturn).toHaveBeenCalledOnce();
    await expect(iterator.next()).resolves.toEqual({ value: undefined, done: true });
  });
});
