import { getServerAuth } from '~/lib/auth.server';
import { serverEnv } from '~/lib/env';

export const AUTH_CONFIG = {
  allowedRedirectPrefixes: [
    '/finance',
    '/import',
    '/accounts',
    '/analytics',
    '/account',
    '/settings',
  ],
  defaultRedirect: '/finance',
  description: 'Enter your email to sign in',
  title: 'Continue to Florin',
} as const;

async function getAuthLoaderState(request: Request) {
  const { user, headers } = await getServerAuth(request);

  return {
    headers,
    user: user
      ? {
          id: user.id,
          email: user.email,
          ...(user.name ? { name: user.name } : {}),
        }
      : null,
  };
}

export const AUTH_ROUTE_CONFIG = {
  ...AUTH_CONFIG,
  apiBaseUrl: serverEnv.VITE_PUBLIC_API_URL,
  getServerAuth: getAuthLoaderState,
};
