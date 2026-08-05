import { oAuthDiscoveryMetadata, oAuthProtectedResourceMetadata } from 'better-auth/plugins';
import { Hono, type Context, type Next } from 'hono';

import { betterAuthMcpServer, MCP_SCOPES } from '../auth/better-auth';
import { env } from '../env';
import { isRateLimited } from './rate-limiter';
import { handleMcpRequestWithSession, type McpHonoEnv } from './server';

// Conditional imports — only register tools whose scope is in MCP_ENABLED_SCOPES
// Use top-level await via ESM (services/api is ESM)
const enabledScopes = new Set(
  env.MCP_ENABLED_SCOPES.split(',')
    .map((scope: string) => scope.trim())
    .filter(Boolean),
);
const requiredScope = MCP_SCOPES[0];

if (enabledScopes.size === 0 || enabledScopes.has('career:read')) {
  await import('./tools/career');
}
if (enabledScopes.size === 0 || enabledScopes.has('finance:read')) {
  await import('./tools/finance');
}

async function addMcpScopes(response: Response): Promise<Response> {
  const metadata = (await response.json()) as { scopes_supported?: string[] } & Record<
    string,
    unknown
  >;
  const headers = new Headers(response.headers);
  headers.set('content-type', 'application/json');

  return new Response(
    JSON.stringify({
      ...metadata,
      scopes_supported: [...new Set([...(metadata.scopes_supported ?? []), ...MCP_SCOPES])],
    }),
    { status: response.status, headers },
  );
}

function createMcpAuthChallenge(error?: 'insufficient_scope') {
  const resourceMetadataUrl = new URL(
    '/.well-known/oauth-protected-resource/api/mcp',
    env.API_URL,
  ).toString();
  const errorParameters =
    error === 'insufficient_scope'
      ? ', error="insufficient_scope", error_description="Missing required MCP scope"'
      : '';

  return `Bearer realm="Hominem", scope="${requiredScope}"${errorParameters}, resource_metadata="${resourceMetadataUrl}"`;
}

async function mcpAuthorizationMiddleware(c: Context<McpHonoEnv>, next: Next) {
  const auth = c.get('auth');
  if (!auth || auth.credential !== 'mcp-oauth') {
    return new Response(
      JSON.stringify({
        error: 'unauthorized',
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      }),
      {
        status: 401,
        headers: {
          'content-type': 'application/json',
          'WWW-Authenticate': createMcpAuthChallenge(),
        },
      },
    );
  }

  if (!MCP_SCOPES.some((scope) => auth.scopes.includes(scope))) {
    return new Response(
      JSON.stringify({
        error: 'insufficient_scope',
        code: 'INSUFFICIENT_SCOPE',
        message: 'The MCP token does not include the required scope',
      }),
      {
        status: 403,
        headers: {
          'content-type': 'application/json',
          'WWW-Authenticate': createMcpAuthChallenge('insufficient_scope'),
        },
      },
    );
  }

  // Rate limit check (production only)
  if (env.NODE_ENV === 'production' && (await isRateLimited(auth.userId))) {
    return new Response(
      JSON.stringify({ error: 'rate_limited', code: 'RATE_LIMITED', message: 'Too many requests' }),
      { status: 429, headers: { 'content-type': 'application/json' } },
    );
  }

  return next();
}

export const mcpRoutes = new Hono<McpHonoEnv>()
  .use('*', mcpAuthorizationMiddleware)
  .all('/', handleMcpRequestWithSession)
  .all('/*', handleMcpRequestWithSession);

/**
 * OAuth discovery routes — mounted at the server root so MCP clients
 * can discover the authorization server without auth.
 */
export const oauthDiscoveryRoutes = new Hono()
  .get('/.well-known/oauth-authorization-server', async (c) => {
    return addMcpScopes(await oAuthDiscoveryMetadata(betterAuthMcpServer)(c.req.raw));
  })
  .get('/.well-known/oauth-protected-resource/*', async (c) => {
    return oAuthProtectedResourceMetadata(betterAuthMcpServer)(c.req.raw);
  })
  .get('/.well-known/oauth-protected-resource', async (c) => {
    return oAuthProtectedResourceMetadata(betterAuthMcpServer)(c.req.raw);
  });
