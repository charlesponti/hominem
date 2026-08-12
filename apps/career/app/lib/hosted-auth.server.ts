import { buildHostedLoginUrl } from '@ponti-studios/auth/shared/redirect-policy';

import { serverEnv } from './env.server';

export const careerAuthConfig = {
  allowedPrefixes: [
    '/account',
    '/onboarding',
    '/applications',
    '/resume',
    '/work',
    '/skills',
    '/stats',
    '/projects',
    '/testimonials',
  ],
  fallback: '/work',
} as const;

export function hostedLoginUrl(request: Request, next?: string | null) {
  const requestUrl = new URL(request.url);
  return buildHostedLoginUrl({
    apiBaseUrl: serverEnv.VITE_PUBLIC_API_URL,
    appOrigin: requestUrl.origin,
    next,
    fallback: careerAuthConfig.fallback,
    allowedPrefixes: careerAuthConfig.allowedPrefixes,
  });
}
