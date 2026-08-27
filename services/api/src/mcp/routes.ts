import { requireMcpAuth } from '@better-auth/mcp';
import { createInsufficientScopeError } from 'better-auth/oauth2';
import { Hono, type Context, type Next } from 'hono';

import { betterAuthServer } from '../auth/better-auth';
import { env } from '../env';
import { setMcpAuthContext } from '../middleware/auth';
import { MCP_SCOPES } from '../scopes';
import { checkRateLimit } from './rate-limiter';
import { ensureMcpToolsRegistered } from './register-tools';
import { handleMcpRequest, type McpHonoEnv } from './server';

// Use top-level await via ESM (services/api is ESM)
await ensureMcpToolsRegistered();

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
  .all('/', handleMcpRequest)
  .all('/*', handleMcpRequest);

/**
 * OAuth discovery routes — mounted at the server root so MCP clients
 * can discover the authorization server without auth.
 */
const mcpResource = new URL('/api/mcp', env.API_URL).toString();

const getOAuthProtectedResourceResponse = (c: Context) => {
  return c.json({
    resource: mcpResource,
    authorization_servers: [new URL('/api/auth', env.API_URL).toString()],
    bearer_methods_supported: ['header'],
    scopes_supported: [...MCP_SCOPES],
  });
};

async function handleOAuthAuthorizationServerMetadata(c: Context) {
  if (c.req.method === 'HEAD') {
    // ChatGPT probes authorization-server metadata with HEAD before fetching it
    // with GET. Do not delegate HEAD to Better Auth: its response has no body,
    // so attempting to parse it produces a 500 and hides valid capabilities.
    return new Response(null, {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  const authUrl = new URL(c.req.url);
  authUrl.pathname = '/api/auth/.well-known/oauth-authorization-server';
  const response = await betterAuthServer.handler(
    new Request(authUrl, { method: c.req.method, headers: c.req.raw.headers }),
  );
  const metadata = (await response.json()) as Record<string, unknown>;

  return c.json({
    ...metadata,
    authorization_response_iss_parameter_supported: false,
  });
}

export const oauthDiscoveryRoutes = new Hono()
  .get('/.well-known/openai-apps-challenge', (c) => {
    if (!env.OPENAI_APPS_CHALLENGE) {
      return c.json({ error: 'OpenAI Apps challenge is not configured' }, 404);
    }
    return c.text(env.OPENAI_APPS_CHALLENGE);
  })
  .get('/.well-known/oauth-authorization-server', (c) => handleOAuthAuthorizationServerMetadata(c))
  .get('/.well-known/oauth-authorization-server/*', (c) =>
    handleOAuthAuthorizationServerMetadata(c),
  )
  .get('/api/auth/.well-known/oauth-authorization-server', (c) =>
    handleOAuthAuthorizationServerMetadata(c),
  )
  .get('/.well-known/oauth-protected-resource', (c) => {
    return getOAuthProtectedResourceResponse(c);
  })
  .get('/.well-known/oauth-protected-resource/*', getOAuthProtectedResourceResponse);
