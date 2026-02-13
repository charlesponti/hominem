'use client';

import type { ReactNode } from 'react';

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRegisterSW } from 'virtual:pwa-register/react';

interface UpdateGuardProps {
  children: ReactNode;
  logo?: string;
  appName?: string;
}

export function UpdateGuard({ children, logo = '/logo.png', appName = 'App' }: UpdateGuardProps) {
  void logo;
  void appName;
  const { needRefresh, updateServiceWorker } = useRegisterSW({
    immediate: true,
  });
  const [isNeedRefresh] = needRefresh;
  const [isOnline, setIsOnline] = useState(true);
  const [hasStaleData, setHasStaleData] = useState(false);
  const queryClient = useQueryClient();
  const isDev =
    typeof import.meta !== 'undefined' &&
    typeof import.meta.env !== 'undefined' &&
    Boolean(import.meta.env.DEV);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }
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
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
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
      {children}
      {offlineMessage && !isDev && (
        <div className="fixed inset-x-0 bottom-16 z-50 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-full border border-border bg-background px-4 py-2 shadow-lg">
            <span className="text-sm text-foreground">{offlineMessage}</span>
          </div>
        </div>
      )}
      {isNeedRefresh && !isDev && (
        <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-full border border-border bg-background px-4 py-2 shadow-lg">
            <span className="text-sm text-foreground">Update available</span>
            <button
              type="button"
              onClick={() => updateServiceWorker(true)}
              className="text-sm font-semibold text-primary"
            >
              Refresh
            </button>
          </div>
        </div>
      )}
    </>
  );
}
