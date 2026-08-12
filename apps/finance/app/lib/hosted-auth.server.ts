import { buildHostedLoginUrl } from '@ponti-studios/auth/shared/redirect-policy';

import { serverEnv } from './env.server';

export const financeAuthConfig = {
  allowedPrefixes: ['/finance', '/import', '/accounts', '/analytics', '/account', '/settings'],
  fallback: '/finance',
} as const;

export function hostedLoginUrl(request: Request, next?: string | null) {
  const requestUrl = new URL(request.url);
  return buildHostedLoginUrl({
    apiBaseUrl: serverEnv.VITE_PUBLIC_API_URL,
    appOrigin: requestUrl.origin,
    next,
    fallback: financeAuthConfig.fallback,
    allowedPrefixes: financeAuthConfig.allowedPrefixes,
  });
}
