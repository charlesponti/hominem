import { useToast } from '@hominem/ui';
import { AppLayout } from '@hominem/ui/components/layout/app-layout';
import { Toaster } from '@hominem/ui/components/ui/toaster';
import { Suspense, useEffect } from 'react';
import { Outlet, useSearchParams } from 'react-router';

import Header from '~/components/header';
import { LoadingScreen } from '~/components/loading';

export default function Layout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

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
      <AppLayout navigation={<Header />}>
        <Suspense fallback={<LoadingScreen />}>
          <Outlet />
        </Suspense>
      </AppLayout>
      <Toaster />
    </>
  );
}
