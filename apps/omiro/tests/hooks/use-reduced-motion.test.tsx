// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockIsReduceMotionEnabled = vi.fn();
let changeListener: ((value: boolean) => void) | undefined;
const mockRemove = vi.fn();

vi.mock('react-native', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-native')>();
  return {
    ...actual,
    AccessibilityInfo: {
      isReduceMotionEnabled: mockIsReduceMotionEnabled,
      addEventListener: (event: string, listener: (value: boolean) => void) => {
        if (event !== 'reduceMotionChanged') return { remove: () => {} };
        changeListener = listener;
        return { remove: mockRemove };
      },
    },
  };
});

// The hook keeps its "has the initial async value been fetched" flag at
// module scope, so each test needs a fresh module instance to observe the
// initial-fetch behavior in isolation.
async function loadHook() {
  vi.resetModules();
  return import('~/hooks/use-reduced-motion');
}

describe('useReducedMotion', () => {
  beforeEach(() => {
    changeListener = undefined;
    mockIsReduceMotionEnabled.mockReset();
    mockRemove.mockReset();
  });

  it('starts false and picks up the initial async accessibility value', async () => {
    mockIsReduceMotionEnabled.mockResolvedValueOnce(true);
    const { useReducedMotion } = await loadHook();
    const { result } = renderHook(() => useReducedMotion());

    await waitFor(() => expect(result.current).toBe(true));
  });

  it('reacts to reduceMotionChanged events', async () => {
    mockIsReduceMotionEnabled.mockResolvedValueOnce(false);
    const { useReducedMotion } = await loadHook();
    const { result } = renderHook(() => useReducedMotion());

    await waitFor(() => expect(changeListener).toBeDefined());

    act(() => {
      changeListener?.(true);
    });

    expect(result.current).toBe(true);
  });

  it('unsubscribes the native listener on unmount', async () => {
    mockIsReduceMotionEnabled.mockResolvedValueOnce(false);
    const { useReducedMotion } = await loadHook();
    const { unmount } = renderHook(() => useReducedMotion());

    await waitFor(() => expect(changeListener).toBeDefined());

    unmount();

    expect(mockRemove).toHaveBeenCalledTimes(1);
  });
});
