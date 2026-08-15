// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { useElapsedTimer } = await import('~/components/voice/useElapsedTimer');

describe('useElapsedTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows 0:00 when there is no startedAt', () => {
    const { result } = renderHook(() => useElapsedTimer(null));
    expect(result.current).toBe('0:00');
  });

  it('ticks up once per second from the startedAt timestamp', () => {
    const startedAt = Date.now();
    const { result } = renderHook(() => useElapsedTimer(startedAt));
    expect(result.current).toBe('0:00');

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe('0:01');

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current).toBe('1:01');
  });

  it('resets to 0:00 when startedAt changes to a new timestamp', () => {
    const first = Date.now();
    const { result, rerender } = renderHook(({ startedAt }) => useElapsedTimer(startedAt), {
      initialProps: { startedAt: first },
    });

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current).toBe('0:05');

    const second = first + 100_000;
    rerender({ startedAt: second });
    expect(result.current).toBe('0:00');
  });

  it('returns to 0:00 when startedAt becomes null and stops ticking', () => {
    const startedAt = Date.now();
    const { result, rerender } = renderHook(
      ({ startedAt: value }: { startedAt: number | null }) => useElapsedTimer(value),
      { initialProps: { startedAt: startedAt as number | null } },
    );

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current).toBe('0:03');

    rerender({ startedAt: null });
    expect(result.current).toBe('0:00');

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current).toBe('0:00');
  });

  it('clears the interval on unmount', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    const { unmount } = renderHook(() => useElapsedTimer(Date.now()));

    unmount();

    expect(clearSpy).toHaveBeenCalled();
  });
});
