// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockMmkvModule } from '../mocks/mmkv';

const mockPreventScreenCaptureAsync = vi.fn().mockResolvedValue(undefined);
const mockAllowScreenCaptureAsync = vi.fn().mockResolvedValue(undefined);
let mockE2ETesting = false;

vi.mock('~/services/storage/mmkv', () => mockMmkvModule());

vi.mock('expo-screen-capture', () => ({
  preventScreenCaptureAsync: mockPreventScreenCaptureAsync,
  allowScreenCaptureAsync: mockAllowScreenCaptureAsync,
}));

vi.mock('~/constants', () => ({
  get E2E_TESTING() {
    return mockE2ETesting;
  },
}));

const { useScreenCapture, setPreventScreenshots } = await import('~/hooks/use-screen-capture');

describe('useScreenCapture', () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockE2ETesting = false;
    setPreventScreenshots(false);
  });

  it('allows screen capture by default', async () => {
    renderHook(() => useScreenCapture());
    await act(async () => {});
    expect(mockAllowScreenCaptureAsync).toHaveBeenCalledTimes(1);
    expect(mockPreventScreenCaptureAsync).not.toHaveBeenCalled();
  });

  it('prevents screen capture once the setting is enabled', async () => {
    setPreventScreenshots(true);
    renderHook(() => useScreenCapture());
    await act(async () => {});
    expect(mockPreventScreenCaptureAsync).toHaveBeenCalledTimes(1);
  });

  it('re-applies the native setting when it toggles after mount', async () => {
    const { rerender } = renderHook(() => useScreenCapture());
    await act(async () => {});
    mockPreventScreenCaptureAsync.mockClear();

    act(() => {
      setPreventScreenshots(true);
    });
    rerender();
    await act(async () => {});

    expect(mockPreventScreenCaptureAsync).toHaveBeenCalledTimes(1);
  });

  it('never touches the native screen-capture APIs during E2E testing', async () => {
    mockE2ETesting = true;
    setPreventScreenshots(true);
    renderHook(() => useScreenCapture());
    await act(async () => {});

    expect(mockPreventScreenCaptureAsync).not.toHaveBeenCalled();
    expect(mockAllowScreenCaptureAsync).not.toHaveBeenCalled();
  });
});
