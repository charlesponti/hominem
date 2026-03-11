'use client';

import { useAuthContext } from '@hominem/auth';
import { PasskeyEnrollmentBanner, usePasskeyAuth, useToast } from '@hominem/ui';
import { AppLayout } from '@hominem/ui/components/layout/app-layout';
import { Toaster } from '@hominem/ui/components/ui/toaster';
import { Suspense, useCallback, useEffect } from 'react';
import { Outlet, useSearchParams } from 'react-router';

import { CaptureBar } from '~/components/capture-bar';
import Header from '~/components/header';
import { LoadingScreen } from '~/components/loading';

export default function Layout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { register } = usePasskeyAuth();
  const { userId } = useAuthContext();
  const isAuthenticated = !!userId;
  const handleEnroll = useCallback(async () => {
    await register();
  }, [register]);

  useEffect(() => {
    const error = searchParams.get('error');
    const description = searchParams.get('description') || searchParams.get('error_description');

    // Show toast for errors from URL params
    if (error) {
      toast({
        variant: 'destructive',
        title: error,
        description: description ?? undefined,
      });

      // Clear the error params from URL without refreshing
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('error');
      newParams.delete('description');
      newParams.delete('error_description');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, toast, setSearchParams]);

  return (
    <>
      <PasskeyEnrollmentBanner onEnroll={handleEnroll} />
      <AppLayout navigation={<Header />}>
        {isAuthenticated && <CaptureBar />}
        <Suspense fallback={<LoadingScreen />}>
          <Outlet />
        </Suspense>
      </AppLayout>
      <Toaster />
    </>
  );
}
