import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

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
