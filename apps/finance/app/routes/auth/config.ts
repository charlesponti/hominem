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
} as const;
