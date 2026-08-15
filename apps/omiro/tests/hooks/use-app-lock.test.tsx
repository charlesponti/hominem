// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mockMmkvModule } from '../mocks/mmkv';

const { fakeAppState } = vi.hoisted(() => {
  type AppStateStatus = 'active' | 'background' | 'inactive';
  type Listener = (status: AppStateStatus) => void;
  let listeners: Listener[] = [];
  let current: AppStateStatus = 'active';

  return {
    fakeAppState: {
      get currentState() {
        return current;
      },
      set currentState(value: AppStateStatus) {
        current = value;
      },
      addEventListener: (event: string, listener: Listener) => {
        if (event !== 'change') return { remove: () => {} };
        listeners.push(listener);
        return {
          remove: () => {
            listeners = listeners.filter((registered) => registered !== listener);
          },
        };
      },
      emit: (status: AppStateStatus) => {
        current = status;
        for (const listener of listeners) listener(status);
      },
      reset: () => {
        listeners = [];
        current = 'active';
      },
    },
  };
});

const mockHasHardwareAsync = vi.fn();
const mockIsEnrolledAsync = vi.fn();
const mockAuthenticateAsync = vi.fn();

vi.mock('~/services/storage/mmkv', () => mockMmkvModule());

vi.mock('react-native', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-native')>();
  return { ...actual, AppState: fakeAppState };
});

vi.mock('expo-local-authentication', () => ({
  hasHardwareAsync: mockHasHardwareAsync,
  isEnrolledAsync: mockIsEnrolledAsync,
  authenticateAsync: mockAuthenticateAsync,
}));

vi.mock('~/constants', () => ({ APP_NAME: 'Omiro' }));

const { useAppLock, setAppLockEnabled } = await import('~/hooks/use-app-lock');

describe('useAppLock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fakeAppState.reset();
    setAppLockEnabled(false);
    mockHasHardwareAsync.mockResolvedValue(true);
    mockIsEnrolledAsync.mockResolvedValue(true);
    mockAuthenticateAsync.mockResolvedValue({ success: true });
  });

  it('is unlocked immediately when app lock is disabled', () => {
    const { result } = renderHook(() => useAppLock());
    expect(result.current.isUnlocked).toBe(true);
  });

  it('starts locked and authenticates automatically when app lock is enabled', async () => {
    setAppLockEnabled(true);
    const { result } = renderHook(() => useAppLock());

    await waitFor(() => expect(result.current.isUnlocked).toBe(true));
    expect(mockAuthenticateAsync).toHaveBeenCalledTimes(1);
  });

  it('stays unlocked when biometric hardware is unavailable', async () => {
    setAppLockEnabled(true);
    mockHasHardwareAsync.mockResolvedValue(false);
    const { result } = renderHook(() => useAppLock());

    await waitFor(() => expect(result.current.isUnlocked).toBe(true));
    expect(mockAuthenticateAsync).not.toHaveBeenCalled();
  });

  it('stays unlocked when no biometrics are enrolled', async () => {
    setAppLockEnabled(true);
    mockIsEnrolledAsync.mockResolvedValue(false);
    const { result } = renderHook(() => useAppLock());

    await waitFor(() => expect(result.current.isUnlocked).toBe(true));
    expect(mockAuthenticateAsync).not.toHaveBeenCalled();
  });

  it('remains locked when biometric authentication fails', async () => {
    setAppLockEnabled(true);
    mockAuthenticateAsync.mockResolvedValue({ success: false });
    const { result } = renderHook(() => useAppLock());

    await waitFor(() => expect(mockAuthenticateAsync).toHaveBeenCalledTimes(1));
    expect(result.current.isUnlocked).toBe(false);
  });

  it('re-locks and re-authenticates when the app returns to foreground from background', async () => {
    setAppLockEnabled(true);
    const { result } = renderHook(() => useAppLock());
    await waitFor(() => expect(result.current.isUnlocked).toBe(true));
    mockAuthenticateAsync.mockClear();

    act(() => {
      fakeAppState.emit('background');
    });
    act(() => {
      fakeAppState.emit('active');
    });

    await waitFor(() => expect(mockAuthenticateAsync).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.isUnlocked).toBe(true));
  });

  it('does not re-authenticate on transitions that are not background -> active', async () => {
    setAppLockEnabled(true);
    const { result } = renderHook(() => useAppLock());
    await waitFor(() => expect(result.current.isUnlocked).toBe(true));
    mockAuthenticateAsync.mockClear();

    act(() => {
      fakeAppState.emit('inactive');
    });

    expect(mockAuthenticateAsync).not.toHaveBeenCalled();
  });

  it('manual authenticate() call unlocks when app lock is disabled without calling native APIs', async () => {
    const { result } = renderHook(() => useAppLock());

    await act(async () => {
      await result.current.authenticate();
    });

    expect(result.current.isUnlocked).toBe(true);
    expect(mockHasHardwareAsync).not.toHaveBeenCalled();
  });
});
