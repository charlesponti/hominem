import { useRouteLoaderData } from 'react-router';

type RootLoaderData = {
  user: { id: string; email: string; name?: string | null } | null;
};

/** Authenticated user from the root loader — available immediately on SSR. */
export const useUser = () => {
  const rootData = useRouteLoaderData<RootLoaderData>('root');
  return rootData?.user ?? null;
};
