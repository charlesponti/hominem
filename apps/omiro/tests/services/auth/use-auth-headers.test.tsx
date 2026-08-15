// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockGetCookie = vi.fn();

vi.mock('~/services/auth/auth-client', () => ({
  authClient: { getCookie: mockGetCookie },
}));

const { useAuthHeaders } = await import('~/services/auth/hooks/use-auth-headers');

describe('useAuthHeaders', () => {
  it('returns a cookie header when a session cookie exists', async () => {
    mockGetCookie.mockReturnValue('session=abc123');
    const { result } = renderHook(() => useAuthHeaders());

    await expect(result.current()).resolves.toEqual({ cookie: 'session=abc123' });
  });

  it('returns an empty object when there is no session cookie', async () => {
    mockGetCookie.mockReturnValue(undefined);
    const { result } = renderHook(() => useAuthHeaders());

    await expect(result.current()).resolves.toEqual({});
  });

  it('returns a stable callback reference across re-renders', () => {
    const { result, rerender } = renderHook(() => useAuthHeaders());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
