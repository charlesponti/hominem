import { vi } from 'vitest';

/**
 * In-memory stand-in for `~/services/storage/mmkv`'s `storage` export.
 * `vi.mock('~/services/storage/mmkv', () => mockMmkvModule())` in a test
 * file's top-level (hoisted) mock factory.
 */
export function mockMmkvModule() {
  const store = new Map<string, string | boolean>();

  return {
    storage: {
      getString: (key: string) => {
        const value = store.get(key);
        return typeof value === 'string' ? value : undefined;
      },
      getBoolean: (key: string) => {
        const value = store.get(key);
        return typeof value === 'boolean' ? value : undefined;
      },
      remove: (key: string) => {
        store.delete(key);
      },
      set: (key: string, value: string | boolean) => {
        store.set(key, value);
      },
    },
    subscribeToStorageKey: vi.fn(() => () => {}),
  };
}
