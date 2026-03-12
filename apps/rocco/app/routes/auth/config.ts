import { serverEnv } from '~/lib/env';

export const AUTH_CONFIG = {
  allowedRedirectPrefixes: [
    '/',
    '/about',
    '/account',
    '/invites',
    '/visits',
    '/lists',
    '/places',
    '/admin',
    '/settings',
  ],
  defaultRedirect: '/visits',
  description: 'Enter your email to sign in',
  title: 'Continue to Rocco',
} as const;

export const AUTH_SERVER_ROUTE_CONFIG = {
  ...AUTH_CONFIG,
  getApiBaseUrl: () => serverEnv.VITE_PUBLIC_API_URL,
} as const;
