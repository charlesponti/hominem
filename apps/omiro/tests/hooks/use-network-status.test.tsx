// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let listener: ((state: { isConnected: boolean | null }) => void) | undefined;
const mockUnsubscribe = vi.fn();
const mockAddEventListener = vi.fn((cb: (state: { isConnected: boolean | null }) => void) => {
  listener = cb;
  return mockUnsubscribe;
});

vi.mock('@react-native-community/netinfo', () => ({
  default: { addEventListener: mockAddEventListener },
}));

const { useNetworkStatus } = await import('~/hooks/use-network-status');

describe('useNetworkStatus', () => {
  // Reset in `beforeEach` (not `afterEach`) so that Testing Library's own
  // automatic unmount-on-cleanup for the *previous* test's hook — which
  // fires in the afterEach chain, sometimes after this file's own
  // afterEach — doesn't leak an extra `mockUnsubscribe` call into the next
  // test's assertions.
  beforeEach(() => {
    vi.clearAllMocks();
    listener = undefined;
  });

  it('starts online before any NetInfo event arrives', () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);
  });

  it('goes offline when NetInfo reports isConnected: false', () => {
    const { result } = renderHook(() => useNetworkStatus());

    act(() => {
      listener?.({ isConnected: false });
    });

    expect(result.current.isOnline).toBe(false);
  });

  it('treats a null isConnected as online', () => {
    const { result } = renderHook(() => useNetworkStatus());

    act(() => {
      listener?.({ isConnected: null });
    });

    expect(result.current.isOnline).toBe(true);
  });

  it('unsubscribes from NetInfo on unmount', () => {
    const { unmount } = renderHook(() => useNetworkStatus());
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
