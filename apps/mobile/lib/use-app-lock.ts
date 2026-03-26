import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { APP_NAME } from '~/utils/constants';

import { storage } from './storage';

const LOCK_ENABLED_KEY = 'app_lock_enabled';

export function getAppLockEnabled(): boolean {
  return storage.getBoolean(LOCK_ENABLED_KEY) ?? false;
}

export function setAppLockEnabled(value: boolean) {
  storage.set(LOCK_ENABLED_KEY, value);
}

export function useAppLock({ isActive = true }: { isActive?: boolean } = {}) {
  const enabled = getAppLockEnabled();
  const shouldLock = enabled && isActive;
  const [isUnlocked, setIsUnlocked] = useState(!shouldLock);
  const appState = useRef(AppState.currentState);

  const authenticate = useCallback(async () => {
    if (!shouldLock) {
      setIsUnlocked(true);
      return;
    }

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      setIsUnlocked(true);
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: `Unlock ${APP_NAME}`,
      fallbackLabel: 'Use passcode',
      cancelLabel: 'Cancel',
    });

    if (result.success) {
      setIsUnlocked(true);
    }
  }, [shouldLock]);

  // Authenticate on mount
  useEffect(() => {
    if (!shouldLock) {
      setIsUnlocked(true);
      return;
    }

    void authenticate();
  }, [authenticate, shouldLock]);

  // Re-lock when app returns from background
  useEffect(() => {
    if (!shouldLock) return;

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current === 'background' && nextState === 'active') {
        setIsUnlocked(false);
        void authenticate();
      }
      appState.current = nextState;
    });

    return () => subscription.remove();
  }, [shouldLock, authenticate]);

  return { isUnlocked, authenticate };
}
