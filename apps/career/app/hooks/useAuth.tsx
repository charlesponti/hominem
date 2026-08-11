import { useRouteLoaderData } from 'react-router';

import type { User } from '../lib/auth.server';

type RootLoaderData = {
  user: User | null;
  hasProfile?: boolean;
};

/**
 * Get the authenticated user from the root loader data
 * This provides server-side user data that's available immediately on page load
 */
export const useUser = (): User | null => {
  const rootData = useRouteLoaderData('root') as RootLoaderData | undefined;
  return rootData?.user ?? null;
};

/** True when the signed-in user has a profile (product nav is available). */
export const useHasProfile = (): boolean => {
  const rootData = useRouteLoaderData('root') as RootLoaderData | undefined;
  return rootData?.hasProfile ?? false;
};
