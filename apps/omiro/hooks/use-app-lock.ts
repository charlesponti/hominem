import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { APP_NAME } from '~/constants';
import { storage, subscribeToStorageKey } from '~/services/storage/mmkv';
import t from '~/translations';

const LOCK_ENABLED_KEY = 'app_lock_enabled';

export function getAppLockEnabled(): boolean {
  return storage.getBoolean(LOCK_ENABLED_KEY) ?? false;
}

export function setAppLockEnabled(value: boolean) {
  storage.set(LOCK_ENABLED_KEY, value);
}

export function useAppLock() {
  const enabled = useSyncExternalStore(
    (onStoreChange) => subscribeToStorageKey(LOCK_ENABLED_KEY, onStoreChange),
    getAppLockEnabled,
    getAppLockEnabled,
  );
  const [isUnlocked, setIsUnlocked] = useState(!enabled);
  const appState = useRef(AppState.currentState);

  const authenticate = useCallback(async () => {
    if (!enabled) {
      setIsUnlocked(true);
      return;
    }

    const [hasHardware, isEnrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);

    if (!hasHardware || !isEnrolled) {
      setIsUnlocked(true);
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: t.auth.unlockPrompt(APP_NAME),
      fallbackLabel: t.auth.unlockFallbackLabel,
      cancelLabel: t.auth.unlockCancelLabel,
    });

    if (result.success) {
      setIsUnlocked(true);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setIsUnlocked(true);
      return;
    }

    setIsUnlocked(false);
    void authenticate();
  }, [enabled, authenticate]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current === 'background' && nextState === 'active') {
        setIsUnlocked(false);
        void authenticate();
      }
      appState.current = nextState;
    });

    return () => {
      subscription.remove();
    };
  }, [enabled, authenticate]);

  return { isUnlocked, authenticate };
}
