import type { ReactNode } from 'react';

import { Toaster } from '../ui/toaster';

interface AuthRouteLayoutProps {
  children: ReactNode;
}

export function AuthRouteLayout({ children }: AuthRouteLayoutProps) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
