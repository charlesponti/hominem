import { useRouteLoaderData } from 'react-router';

import type { User } from '../lib/auth.server';

type RootLoaderData = {
  user: User | null;
  hasProfile?: boolean;
  apiBaseUrl: string;
};

// Pulls the user from root's loader data, so it's there immediately on page load
export const useUser = (): User | null => {
  const rootData = useRouteLoaderData<RootLoaderData>('root');
  return rootData?.user ?? null;
};

/** True when the signed-in user has a profile (product nav is available). */
export const useHasProfile = (): boolean => {
  const rootData = useRouteLoaderData<RootLoaderData>('root');
  return rootData?.hasProfile ?? false;
};

/** The public API origin, resolved server-side and threaded through root's loader data. */
export const useApiBaseUrl = (): string | undefined => {
  const rootData = useRouteLoaderData<RootLoaderData>('root');
  return rootData?.apiBaseUrl;
};
