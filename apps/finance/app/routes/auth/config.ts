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

export const AUTH_ROUTE_CONFIG = {
  ...AUTH_CONFIG,
  apiBaseUrl: serverEnv.VITE_PUBLIC_API_URL,
};
