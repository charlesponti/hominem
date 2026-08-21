import { buildHostedLoginUrl } from '@ponti-studios/auth/shared/redirect-policy';

import { serverEnv } from './env.server';

export const webAuthConfig = {
  allowedPrefixes: ['/', '/chat', '/notes', '/account', '/settings'],
  fallback: '/notes',
} as const;

export function hostedLoginUrl(next?: string | null) {
  return buildHostedLoginUrl({
    apiBaseUrl: serverEnv.VITE_PUBLIC_API_URL,
    appOrigin: serverEnv.PUBLIC_APP_URL,
    next,
    fallback: webAuthConfig.fallback,
    allowedPrefixes: webAuthConfig.allowedPrefixes,
  });
}
