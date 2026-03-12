import { NOTES_AUTH_CONFIG } from '@hominem/auth';

import { serverEnv } from '~/lib/env';

export const AUTH_CONFIG = {
  allowedRedirectPrefixes: NOTES_AUTH_CONFIG.allowedDestinations,
  defaultRedirect: NOTES_AUTH_CONFIG.defaultPostAuthDestination,
  description: NOTES_AUTH_CONFIG.copy.emailEntry.subtitle,
  title: `Continue to ${NOTES_AUTH_CONFIG.appName}`,
} as const;

export const AUTH_SERVER_ROUTE_CONFIG = {
  ...AUTH_CONFIG,
  getApiBaseUrl: () => serverEnv.VITE_PUBLIC_API_URL,
} as const;
