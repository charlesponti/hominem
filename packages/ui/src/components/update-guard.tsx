'use client';

import type { ReactNode } from 'react';

import { useEffect, useState } from 'react';

interface UpdateGuardProps {
  children: ReactNode;
  logo?: string;
  appName?: string;
}

const ASCII_LOADING = `
  ____  _            _       _     _
 |  _ \\| |          | |     | |   (_)
 | |_) | |_   _  ___| | __ _| |_   _  ___
 |  _ <| | | | |/ __| |/ _\` | __| | |/ _ \\
 | |_) | | |_| | (__| | (_| | |_  | | (_) |
 |____/|_|\\__,_|\\___|_|\\__,_|\\__| |_|\\___/
`;

export function UpdateGuard({ children, logo = '/logo.png', appName = 'App' }: UpdateGuardProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      setIsReady(true); // Not a PWA-capable browser
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let controllerChangeHandler: (() => void) | null = null;

    const clearTimeoutAndSetReady = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      setIsReady(true);
    };

    // Set fallback timeout
    timeoutId = setTimeout(() => {
      setIsReady(true);
    }, 3000);

    // Handle controller change (new service worker activated)
    controllerChangeHandler = () => {
      window.location.reload();
    };

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // Manually trigger an update check on launch
        reg.update();

        // If a new worker takes over, reload the app to get new assets
        if (controllerChangeHandler) {
          navigator.serviceWorker.addEventListener('controllerchange', controllerChangeHandler);
        }

        // If there's already an active controller, we're good to go
        if (navigator.serviceWorker.controller) {
          clearTimeoutAndSetReady();
        } else {
          // First-time install: wait for the SW to be ready
          navigator.serviceWorker.ready.then(() => {
            clearTimeoutAndSetReady();
          });
        }
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
        clearTimeoutAndSetReady(); // Still show the app even if SW fails
      });

    // Cleanup function
    return () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      if (controllerChangeHandler) {
        navigator.serviceWorker.removeEventListener('controllerchange', controllerChangeHandler);
      }
    };
  }, []);

  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <pre className="text-primary font-mono text-sm mb-4 animate-pulse">{ASCII_LOADING}</pre>
        <p className="text-muted-foreground text-sm">Checking for updates...</p>
      </div>
    );
  }

  return <>{children}</>;
}
