'use client';

import type { ReactNode } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

interface UpdateGuardProps {
  children: ReactNode;
  logo?: string;
  appName?: string;
}

const UPDATE_INTERVAL_MS = 60 * 60 * 1000;

function UpdateGuardClient({ logo = '/logo.png', appName = 'App' }: Omit<UpdateGuardProps, 'children'>) {
  void logo;
  void appName;

  const [isOnline, setIsOnline] = useState(true);
  const [hasStaleData, setHasStaleData] = useState(false);
  const queryClient = useQueryClient();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
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
    onRegistered(registration) {
      if (registration) {
        intervalRef.current = setInterval(() => {
          void registration.update();
        }, UPDATE_INTERVAL_MS);
      }
    },
    onRegisterError(error) {
      console.error('Service worker registration error:', error);
    },
  });

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (isDev) {
      if ('serviceWorker' in navigator) {
        void navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            void registration.unregister();
          }
        });
      }
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isDev]);

  useEffect(() => {
    const updateStaleState = () => {
      const queries = queryClient.getQueryCache().getAll();
      const hasStale = queries.some((query) => query.state.data !== undefined && query.isStale());
      setHasStaleData(hasStale);
    };

    updateStaleState();

    const unsubscribe = queryClient.getQueryCache().subscribe(updateStaleState);
    return () => {
      unsubscribe();
    };
  }, [queryClient]);

  const closePrompt = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  const offlineMessage = useMemo(() => {
    if (isOnline) {
      return null;
    }
    return hasStaleData
      ? 'Offline — showing cached data where available'
      : 'Offline — data may be unavailable';
  }, [hasStaleData, isOnline]);

  return (
    <>
      {offlineMessage && !isDev && (
        <div className="fixed inset-x-0 bottom-16 z-50 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-full border border-border bg-background px-4 py-2 shadow-lg">
            <span className="text-sm text-foreground">{offlineMessage}</span>
          </div>
        </div>
      )}
      {(offlineReady || needRefresh) && !isDev && (
        <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-full border border-border bg-background px-4 py-2 shadow-lg">
            <span className="text-sm text-foreground">
              {offlineReady ? 'App ready to work offline' : 'New content available'}
            </span>
            {needRefresh && (
              <button
                type="button"
                onClick={() => updateServiceWorker(true)}
                className="text-sm font-semibold text-primary"
              >
                Refresh
              </button>
            )}
            <button
              type="button"
              onClick={closePrompt}
              className="text-sm text-foreground/70"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function UpdateGuard({ children, logo = '/logo.png', appName = 'App' }: UpdateGuardProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <>
      {children}
      {isMounted ? <UpdateGuardClient logo={logo} appName={appName} /> : null}
    </>
  );
}
