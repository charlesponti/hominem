import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

interface RegisterSWOptions {
  immediate?: boolean;
  onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
  onRegisterError?: (error: Error) => void;
}

interface RegisterSWResult {
  offlineReady: [boolean, (value: boolean) => void];
  needRefresh: [boolean, (value: boolean) => void];
  updateServiceWorker: (reload?: boolean) => void;
}

function useRegisterSW(options?: RegisterSWOptions): RegisterSWResult {
  const [offlineReady, setOfflineReady] = useState(false);
  const [needRefresh, setNeedRefresh] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | undefined>(undefined);
  const shouldReloadRef = useRef(false);
  const hasReloadedRef = useRef(false);
  const onRegisteredRef = useRef(options?.onRegistered);
  const onRegisterErrorRef = useRef(options?.onRegisterError);

  useEffect(() => {
    onRegisteredRef.current = options?.onRegistered;
    onRegisterErrorRef.current = options?.onRegisterError;
  }, [options?.onRegistered, options?.onRegisterError]);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !window.isSecureContext
    ) {
      return;
    }

    let isMounted = true;

    const handleControllerChange = () => {
      if (!shouldReloadRef.current || hasReloadedRef.current) {
        return;
      }

      hasReloadedRef.current = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    const handleWaitingServiceWorker = (registration: ServiceWorkerRegistration) => {
      registrationRef.current = registration;

      if (!isMounted) {
        return;
      }

      setNeedRefresh(true);
      setOfflineReady(false);
    };

    const handleInstalledServiceWorker = (registration: ServiceWorkerRegistration) => {
      registrationRef.current = registration;

      if (!isMounted) {
        return;
      }

      if (navigator.serviceWorker.controller) {
        setNeedRefresh(true);
        setOfflineReady(false);
        return;
      }

      setOfflineReady(true);
    };

    const trackRegistration = (registration: ServiceWorkerRegistration) => {
      registrationRef.current = registration;
      onRegisteredRef.current?.(registration);

      if (registration.waiting) {
        handleWaitingServiceWorker(registration);
      }

      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (!installingWorker) {
          return;
        }

        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state !== 'installed') {
            return;
          }

          handleInstalledServiceWorker(registration);
        });
      });
    };

    void navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        if (!isMounted) {
          return;
        }

        trackRegistration(registration);
        return navigator.serviceWorker.ready.then(() => {
          if (!isMounted || navigator.serviceWorker.controller) {
            return;
          }

          setOfflineReady(true);
        });
      })
      .catch((error: Error) => {
        if (!isMounted) {
          return;
        }

        onRegisterErrorRef.current?.(error);
      });

    return () => {
      isMounted = false;
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  return {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker: (reload = true) => {
      shouldReloadRef.current = reload;
      registrationRef.current?.waiting?.postMessage({ type: 'SKIP_WAITING' });
    },
  };
}

interface UpdateGuardProps {
  children: ReactNode;
  logo?: string;
  appName?: string;
}

function subscribeOnline(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.addEventListener('online', onStoreChange);
  window.addEventListener('offline', onStoreChange);

  return () => {
    window.removeEventListener('online', onStoreChange);
    window.removeEventListener('offline', onStoreChange);
  };
}

function getOnlineSnapshot() {
  if (typeof navigator === 'undefined') {
    return true;
  }

  return navigator.onLine;
}

function hasStaleQueryData(queryClient: QueryClient): boolean {
  const queries = queryClient.getQueryCache().getAll();
  return queries.some((query) => query.state.data !== undefined && query.isStale());
}

function UpdateGuardClient({
  logo = '/logo.web.png',
  appName = 'App',
}: Omit<UpdateGuardProps, 'children'>) {
  void logo;
  void appName;

  const queryClient = useQueryClient();
  const isDev =
    typeof import.meta !== 'undefined' &&
    typeof import.meta.env !== 'undefined' &&
    Boolean(import.meta.env.DEV);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegistered() {
      // Service worker refresh is intentionally managed by vite-plugin-pwa.
    },
    onRegisterError() {
      // Service worker registration errors are non-critical.
    },
  });

  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, () => true);

  const subscribeQueryStaleState = useCallback(
    (onStoreChange: () => void) => {
      const unsubscribe = queryClient.getQueryCache().subscribe(() => {
        onStoreChange();
      });

      return () => {
        unsubscribe();
      };
    },
    [queryClient],
  );

  const getQueryStaleSnapshot = useCallback(() => hasStaleQueryData(queryClient), [queryClient]);

  const hasStaleData = useSyncExternalStore(
    subscribeQueryStaleState,
    getQueryStaleSnapshot,
    () => false,
  );

  const closePrompt = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  const offlineMessage = useMemo(() => {
    if (isOnline) {
      return null;
    }
    return hasStaleData
      ? 'Offline - showing cached data where available'
      : 'Offline - data may be unavailable';
  }, [hasStaleData, isOnline]);

  return (
    <>
      {offlineMessage && !isDev && (
        <div className="fixed inset-x-0 bottom-16 z-50 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-md border border-default bg-surface px-4 py-2">
            <span className="text-sm text-text-primary">{offlineMessage}</span>
          </div>
        </div>
      )}
      {(offlineReady || needRefresh) && !isDev && (
        <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-md border border-default bg-surface px-4 py-2">
            <span className="text-sm text-text-primary">
              {offlineReady ? 'App ready to work offline' : 'New content available'}
            </span>
            {needRefresh && (
              <button
                type="button"
                onClick={() => updateServiceWorker(true)}
                className="text-sm font-semibold text-accent"
              >
                Refresh
              </button>
            )}
            <button type="button" onClick={closePrompt} className="text-sm text-text-secondary">
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function UpdateGuard({ children, logo = '', appName = 'App' }: UpdateGuardProps) {
  const isClient = typeof window !== 'undefined';

  return (
    <>
      {children}
      {isClient ? <UpdateGuardClient logo={logo} appName={appName} /> : null}
    </>
  );
}
