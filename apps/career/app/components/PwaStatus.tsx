import { Alert, AlertDescription, AlertTitle } from '@ponti-studios/ui/feedback';
import { Button } from '@ponti-studios/ui/primitives';
import { WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function PwaStatus() {
  const [mounted, setMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setMounted(true);
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError: (error) => console.error('Service worker registration error', error),
  });

  if (!mounted) {
    return null;
  }

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!isOnline) {
    return (
      <div className="fixed bottom-4 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 px-4">
        <Alert>
          <WifiOff className="size-4" />
          <AlertTitle>You're offline</AlertTitle>
          <AlertDescription>Some data may be unavailable until you reconnect.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (needRefresh) {
    return (
      <div className="fixed bottom-4 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 px-4">
        <Alert>
          <AlertTitle>New content available</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-2">
            <span>Refresh to update the app.</span>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => updateServiceWorker(true)}>
                Refresh
              </Button>
              <Button size="sm" variant="ghost" onClick={close}>
                Dismiss
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (offlineReady) {
    return (
      <div className="fixed bottom-4 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 px-4">
        <Alert>
          <AlertTitle>App ready to work offline</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-2">
            <span>Career is now available offline.</span>
            <Button size="sm" variant="ghost" onClick={close}>
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return null;
}
