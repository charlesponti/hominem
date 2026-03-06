import { PasskeyEnrollmentBanner, usePasskeyAuth } from '@hominem/ui'
import { AppLayout } from '@hominem/ui/components/layout/app-layout';
import { Toaster } from '@hominem/ui/components/ui/toaster';
import { useCallback, Suspense } from 'react';
import { Outlet } from 'react-router';

import Header from '../components/header';
import { LoadingScreen } from '../components/loading';

export default function Layout() {
  const { register } = usePasskeyAuth()
  const handleEnroll = useCallback(async () => { await register() }, [register])

  return (
    <>
      <PasskeyEnrollmentBanner onEnroll={handleEnroll} />
      <AppLayout navigation={<Header />}>
        <Suspense fallback={<LoadingScreen />}>
          <Outlet />
        </Suspense>
      </AppLayout>
      <Toaster />
    </>
  );
}
