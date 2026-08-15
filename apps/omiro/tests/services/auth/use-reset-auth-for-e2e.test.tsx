// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithQueryClient } from '../../utils/render-hook';

const mockSignOut = vi.fn();
const mockClearPersistedQueryCache = vi.fn();
const mockClearAllData = vi.fn();
const { mockE2ETesting } = vi.hoisted(() => ({ mockE2ETesting: { value: false } }));

vi.mock('~/constants', () => ({
  get E2E_TESTING() {
    return mockE2ETesting.value;
  },
}));

vi.mock('~/services/auth/auth-client', () => ({
  authClient: { signOut: mockSignOut },
}));

vi.mock('~/services/query-persistence', () => ({
  clearPersistedQueryCache: mockClearPersistedQueryCache,
}));

vi.mock('~/services/storage/local-store', () => ({
  LocalStore: { clearAllData: mockClearAllData },
}));

const { useResetAuthForE2E } = await import('~/services/auth/hooks/use-reset-auth-for-e2e');

describe('useResetAuthForE2E', () => {
  afterEach(() => {
    mockE2ETesting.value = false;
  });

  it('is a no-op outside of e2e mode', async () => {
    mockE2ETesting.value = false;
    const { result } = renderHookWithQueryClient(() => useResetAuthForE2E());

    await act(async () => {
      await result.current();
    });

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockClearPersistedQueryCache).not.toHaveBeenCalled();
    expect(mockClearAllData).not.toHaveBeenCalled();
  });

  it('signs out, clears the query cache, and wipes local storage in e2e mode', async () => {
    mockE2ETesting.value = true;
    mockSignOut.mockResolvedValueOnce({ error: null });
    const { result, queryClient } = renderHookWithQueryClient(() => useResetAuthForE2E());
    queryClient.setQueryData(['some', 'key'], 'value');
    const clearSpy = vi.spyOn(queryClient, 'clear');

    await act(async () => {
      await result.current();
    });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(mockClearPersistedQueryCache).toHaveBeenCalledTimes(1);
    expect(mockClearAllData).toHaveBeenCalledTimes(1);
  });
});
