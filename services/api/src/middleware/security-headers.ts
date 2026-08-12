import type { MiddlewareHandler } from 'hono';

import { env } from '../env';

const API_CONTENT_SECURITY_POLICY = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'";

function isApiResponse(path: string) {
  return path.startsWith('/api/') || path === '/openapi.json';
}

export function securityHeadersMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    await next();

    if (!isApiResponse(c.req.path)) return;

    c.header('Content-Security-Policy', API_CONTENT_SECURITY_POLICY);
    c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header('X-Content-Type-Options', 'nosniff');

    if (env.NODE_ENV === 'production') {
      c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
  };
}
