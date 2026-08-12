import { buildHostedLoginUrl } from '@ponti-studios/auth/shared/redirect-policy';

import { serverEnv } from './env.server';

export const financeAuthConfig = {
  allowedPrefixes: ['/finance', '/import', '/accounts', '/analytics', '/account', '/settings'],
  fallback: '/finance',
} as const;

export function hostedLoginUrl(next?: string | null) {
  return buildHostedLoginUrl({
    apiBaseUrl: serverEnv.VITE_PUBLIC_API_URL,
    appOrigin: serverEnv.PUBLIC_APP_URL,
    next,
    fallback: financeAuthConfig.fallback,
    allowedPrefixes: financeAuthConfig.allowedPrefixes,
  });
}
