// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithQueryClient } from '../../utils/render-hook';

const mockSignOut = vi.fn();
const mockClearPersistedQueryCache = vi.fn();
const mockClearAllData = vi.fn();
const mockCaptureEvent = vi.fn();
const mockCaptureFailure = vi.fn();

vi.mock('~/services/auth/auth-client', () => ({
  authClient: { signOut: mockSignOut },
}));

vi.mock('~/services/query-persistence', () => ({
  clearPersistedQueryCache: mockClearPersistedQueryCache,
}));

vi.mock('~/services/storage/local-store', () => ({
  LocalStore: { clearAllData: mockClearAllData },
}));

vi.mock('~/services/auth/analytics', () => ({
  captureAuthAnalyticsEvent: mockCaptureEvent,
  captureAuthAnalyticsFailure: mockCaptureFailure,
}));

const { useSignOut } = await import('~/services/auth/hooks/use-sign-out');

describe('useSignOut', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('signs out, clears query cache and storage, and records success with the current email', async () => {
    mockSignOut.mockResolvedValueOnce({ error: null });
    const { result, queryClient } = renderHookWithQueryClient(() => useSignOut('user@example.com'));
    const clearSpy = vi.spyOn(queryClient, 'clear');

    await act(async () => {
      await result.current();
    });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(mockClearPersistedQueryCache).toHaveBeenCalledTimes(1);
    expect(mockClearAllData).toHaveBeenCalledTimes(1);
    expect(mockCaptureEvent).toHaveBeenCalledWith(
      'auth_sign_out_succeeded',
      expect.objectContaining({ email: 'user@example.com' }),
    );
  });

  it('still clears query cache and storage when Better Auth returns an error, then throws', async () => {
    mockSignOut.mockResolvedValueOnce({ error: { message: 'Session already expired' } });
    const { result, queryClient } = renderHookWithQueryClient(() => useSignOut('user@example.com'));
    const clearSpy = vi.spyOn(queryClient, 'clear');

    await act(async () => {
      await expect(result.current()).rejects.toThrow('Session already expired');
    });

    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(mockClearPersistedQueryCache).toHaveBeenCalledTimes(1);
    expect(mockClearAllData).toHaveBeenCalledTimes(1);
    expect(mockCaptureFailure).toHaveBeenCalledWith(
      'auth_sign_out_failed',
      expect.objectContaining({ email: 'user@example.com' }),
    );
  });

  it('still clears query cache and storage when the sign-out request itself rejects, then throws', async () => {
    mockSignOut.mockRejectedValueOnce(new Error('network down'));
    const { result, queryClient } = renderHookWithQueryClient(() => useSignOut('user@example.com'));
    const clearSpy = vi.spyOn(queryClient, 'clear');

    await act(async () => {
      await expect(result.current()).rejects.toThrow('network down');
    });

    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(mockClearPersistedQueryCache).toHaveBeenCalledTimes(1);
    expect(mockClearAllData).toHaveBeenCalledTimes(1);
    expect(mockCaptureFailure).toHaveBeenCalledWith(
      'auth_sign_out_failed',
      expect.objectContaining({ email: 'user@example.com' }),
    );
  });

  it('records analytics with an undefined email when no current email is provided', async () => {
    mockSignOut.mockResolvedValueOnce({ error: null });
    const { result } = renderHookWithQueryClient(() => useSignOut(null));

    await act(async () => {
      await result.current();
    });

    expect(mockCaptureEvent).toHaveBeenCalledWith(
      'auth_sign_out_succeeded',
      expect.objectContaining({ email: undefined }),
    );
  });
});
