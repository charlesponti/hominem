import { requireMcpAuth } from '@better-auth/mcp';
import { createInsufficientScopeError } from 'better-auth/oauth2';
import { Hono, type Context, type Next } from 'hono';

import { betterAuthServer } from '../auth/better-auth';
import { env } from '../env';
import { setMcpAuthContext } from '../middleware/auth';
import { MCP_ENABLED_SCOPES, MCP_SCOPES } from '../scopes';
import { checkRateLimit } from './rate-limiter';
import { handleMcpRequestWithSession, type McpHonoEnv } from './server';

// Conditional imports — only register tools whose scope is in MCP_ENABLED_SCOPES
// Use top-level await via ESM (services/api is ESM)
const enabledScopes = new Set<string>(MCP_ENABLED_SCOPES);
if (
  enabledScopes.size === 0 ||
  enabledScopes.has('calendar:read') ||
  enabledScopes.has('travel:read')
) {
  await import('./tools/calendar');
}
if (
  enabledScopes.size === 0 ||
  enabledScopes.has('career:read') ||
  enabledScopes.has('career:write')
) {
  await import('./tools/career');
}
if (
  enabledScopes.size === 0 ||
  enabledScopes.has('collections:read') ||
  enabledScopes.has('collections:write')
) {
  await import('./tools/collections');
}
if (enabledScopes.size === 0 || enabledScopes.has('finance:read')) {
  await import('./tools/finance');
}
if (enabledScopes.size === 0 || enabledScopes.has('health:read')) {
  await import('./tools/health');
}
if (enabledScopes.size === 0 || enabledScopes.has('media:read')) {
  await import('./tools/media');
}
if (enabledScopes.size === 0 || enabledScopes.has('people:read')) {
  await import('./tools/people');
}
if (enabledScopes.size === 0 || enabledScopes.has('places:read')) {
  await import('./tools/places');
}
if (enabledScopes.size === 0 || enabledScopes.has('tags:read') || enabledScopes.has('tags:write')) {
  await import('./tools/tags');
}
if (enabledScopes.size === 0 || enabledScopes.has('services:read')) {
  // services:read is gated for person_services table (no tools yet, but schema must be present)
}
if (enabledScopes.size === 0 || enabledScopes.has('social:read')) {
  await import('./tools/social');
}

export async function mcpAuthorizationMiddleware(c: Context<McpHonoEnv>, next: Next) {
  const verifiedHandler = requireMcpAuth(
    betterAuthServer,
    async (_request, claims) => {
      if (!(await setMcpAuthContext(c, claims))) {
        return new Response(JSON.stringify({ error: 'invalid_token' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        });
      }

      const auth = c.get('auth');
      if (!auth || !MCP_SCOPES.some((scope) => auth.scopes.includes(scope))) {
        throw createInsufficientScopeError([...MCP_SCOPES]);
      }

      if (env.NODE_ENV === 'production') {
        const rateLimitResult = await checkRateLimit(auth.userId);
        if (rateLimitResult === 'unavailable') {
          return new Response(JSON.stringify({ error: 'rate_limit_unavailable' }), {
            status: 503,
            headers: { 'content-type': 'application/json', 'retry-after': '5' },
          });
        }
        if (rateLimitResult === 'limited') {
          return new Response(JSON.stringify({ error: 'rate_limited' }), {
            status: 429,
            headers: { 'content-type': 'application/json' },
          });
        }
      }

      await next();
      return c.res;
    },
    {
      resource: new URL('/api/mcp', env.API_URL).toString(),
      issuer: new URL('/api/auth', env.API_URL).toString(),
      challengeScopes: [...MCP_SCOPES],
    },
  );

  return verifiedHandler(c.req.raw);
}

export const mcpRoutes = new Hono<McpHonoEnv>()
  .use('*', mcpAuthorizationMiddleware)
  .all('/', handleMcpRequestWithSession)
  .all('/*', handleMcpRequestWithSession);

/**
 * OAuth discovery routes — mounted at the server root so MCP clients
 * can discover the authorization server without auth.
 */
const mcpResource = new URL('/api/mcp', env.API_URL).toString();

export const oauthDiscoveryRoutes = new Hono()
  .get('/.well-known/openai-apps-challenge', (c) => {
    if (!env.OPENAI_APPS_CHALLENGE) {
      return c.json({ error: 'OpenAI Apps challenge is not configured' }, 404);
    }
    return c.text(env.OPENAI_APPS_CHALLENGE);
  })
  .get('/.well-known/oauth-authorization-server', (c) => {
    const authUrl = new URL(c.req.url);
    authUrl.pathname = '/api/auth/.well-known/oauth-authorization-server';
    return betterAuthServer.handler(
      new Request(authUrl, { method: c.req.method, headers: c.req.raw.headers }),
    );
  })
  .get('/.well-known/oauth-protected-resource', (c) => {
    return c.json({
      resource: mcpResource,
      authorization_servers: [new URL('/api/auth', env.API_URL).toString()],
      bearer_methods_supported: ['header'],
      scopes_supported: [...MCP_SCOPES],
    });
  })
  .get('/.well-known/oauth-protected-resource/*', (c) => {
    return c.json({
      resource: mcpResource,
      authorization_servers: [new URL('/api/auth', env.API_URL).toString()],
      bearer_methods_supported: ['header'],
      scopes_supported: [...MCP_SCOPES],
    });
  });
