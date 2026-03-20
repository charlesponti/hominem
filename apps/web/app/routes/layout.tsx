import { PasskeyEnrollmentBanner, usePasskeyAuth, useToast } from '@hominem/ui';
import { AppLayout } from '@hominem/ui/components/layout/app-layout';
import { Toaster } from '@hominem/ui/components/ui/toaster';
import React, { Suspense, useCallback, useEffect } from 'react';
import { Outlet, useSearchParams } from 'react-router';

import NotesHeader from '~/components/header';
import { Composer } from '~/components/composer';
import { ComposerProvider } from '~/components/composer/composer-provider';
import { LoadingScreen } from '~/components/loading';

export default function Layout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { register } = usePasskeyAuth();
  const handleEnroll = useCallback(async () => {
    await register();
  }, [register]);

  useEffect(() => {
    const error = searchParams.get('error');
    const description = searchParams.get('description') || searchParams.get('error_description');

    if (error) {
      toast({
        variant: 'destructive',
        title: error,
        description: description ?? undefined,
      });

      const newParams = new URLSearchParams(searchParams);
      newParams.delete('error');
      newParams.delete('description');
      newParams.delete('error_description');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, toast, setSearchParams]);

  return (
    // CSS var consumed by all Notes route scroll containers for bottom padding
    <ComposerProvider>
      <div
        style={
          {
            '--composer-resting-height': 'calc(env(safe-area-inset-bottom) + 112px)',
          } as React.CSSProperties
        }
      >
        <PasskeyEnrollmentBanner onEnroll={handleEnroll} />
        <AppLayout navigation={<NotesHeader />}>
          <Suspense fallback={<LoadingScreen />}>
            <Outlet />
          </Suspense>
        </AppLayout>
        <Composer />
        <Toaster />
      </div>
    </ComposerProvider>
  );
}
