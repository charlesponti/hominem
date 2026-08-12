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

function getPublicOrigin(request: Request) {
  const url = new URL(request.url);
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();

  if (forwardedProto === 'http' || forwardedProto === 'https') url.protocol = `${forwardedProto}:`;
  if (forwardedHost) url.host = forwardedHost;

  return url.origin;
}

export function hostedLoginUrl(request: Request, next?: string | null) {
  return buildHostedLoginUrl({
    apiBaseUrl: serverEnv.VITE_PUBLIC_API_URL,
    appOrigin: getPublicOrigin(request),
    next,
    fallback: careerAuthConfig.fallback,
    allowedPrefixes: careerAuthConfig.allowedPrefixes,
  });
}
