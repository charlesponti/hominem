import type { Query } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => ({
  getString: () => undefined,
  remove: vi.fn(),
  set: () => undefined,
}));

vi.mock('~/services/storage/mmkv', () => ({
  storage,
}));

import {
  clearPersistedQueryCache,
  mobilePersistOptions,
  shouldPersistQuery,
} from '~/services/query-persistence';

function query(input: { data: unknown; key: readonly unknown[]; status?: 'pending' | 'success' }) {
  return {
    queryKey: input.key,
    state: { data: input.data, status: input.status ?? 'success' },
  } as Query<unknown, Error, unknown, readonly unknown[]>;
}

describe('mobile query persistence', () => {
  it('uses the versioned cache buster and one-week expiry', () => {
    expect(mobilePersistOptions.buster).toBe('omiro-react-query-v2');
    expect(mobilePersistOptions.maxAge).toBe(7 * 24 * 60 * 60_000);
  });

  it('persists successful application data but excludes in-flight streams', () => {
    expect(shouldPersistQuery(query({ key: ['notes', 'detail', 'note-1'], data: {} }))).toBe(true);
    expect(
      shouldPersistQuery(
        query({
          key: ['chats', 'messages', 'chat-1'],
          data: [{ id: 'message-1', isStreaming: true }],
        }),
      ),
    ).toBe(false);
    expect(shouldPersistQuery(query({ key: ['notes'], data: {}, status: 'pending' }))).toBe(false);
  });

  it('removes the complete persisted cache during a session reset', async () => {
    await clearPersistedQueryCache();
    expect(storage.remove).toHaveBeenCalledWith('omiro-react-query-v2');
  });
});
