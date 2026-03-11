import { serverEnv } from '~/lib/env';

export const AUTH_CONFIG = {
  allowedRedirectPrefixes: ['/', '/home', '/chat', '/notes', '/account', '/settings'],
  defaultRedirect: '/home',
  description: 'Enter your email to sign in',
  title: 'Continue to Notes',
} as const;

export const AUTH_ROUTE_CONFIG = {
  ...AUTH_CONFIG,
  apiBaseUrl: serverEnv.VITE_PUBLIC_API_URL,
};
