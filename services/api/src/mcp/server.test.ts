import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import * as z from 'zod';

import type { AuthContext } from '../auth/types';
import type { AppContext, RpcUser } from '../rpc/middleware/auth';
import { requestIdMiddleware } from '../rpc/middleware/auth';
import { apiErrorHandler } from '../rpc/middleware/error';
import { validationErrorMiddleware } from '../rpc/middleware/validation';
import { mcpRoutes, oauthDiscoveryRoutes } from './routes';
import { listTools, registerTool } from './tools';

vi.mock('@better-auth/mcp', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@better-auth/mcp')>()),
  requireMcpAuth:
    (
      _auth: unknown,
      handler: (request: Request, claims: Record<string, unknown>) => Promise<Response>,
    ) =>
    async (request: Request) => {
      const authorization = request.headers.get('authorization');
      if (!authorization) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), {
          status: 401,
          headers: {
            'content-type': 'application/json',
            'www-authenticate':
              'Bearer scope="calendar:read career:read" resource_metadata="http://localhost/.well-known/oauth-protected-resource/api/mcp"',
          },
        });
      }
      return handler(request, {
        sub: testUser.id,
        client_id: 'test-client',
        scope: request.headers.get('x-mcp-scopes') ?? 'career:read finance:read',
      }).catch(
        () => new Response(JSON.stringify({ error: 'insufficient_scope' }), { status: 403 }),
      );
    },
}));

vi.mock('../middleware/auth', () => ({
  setMcpAuthContext: async (
    c: { set: (key: 'auth', value: AuthContext) => void },
    claims: Record<string, unknown>,
  ) => {
    c.set('auth', {
      user: testUser,
      userId: testUser.id,
      clientId: typeof claims.client_id === 'string' ? claims.client_id : undefined,
      credential: 'mcp-oauth',
      scopes: typeof claims.scope === 'string' ? claims.scope.split(' ') : [],
    });
    return true;
  },
}));

const testUser: RpcUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'mcp@example.com',
  name: 'MCP Test User',
  emailVerified: true,
  image: null,
  isAdmin: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function createApp(auth?: AuthContext) {
  const app = new Hono<AppContext>()
    .onError(apiErrorHandler)
    .use(requestIdMiddleware)
    .use(validationErrorMiddleware)
    .basePath('/api');

  if (auth) {
    app.use('*', async (c, next) => {
      c.set('auth', auth);
      await next();
    });
  }

  app.route('/mcp', mcpRoutes);

  return app;
}

const mcpAuthContext = {
  user: testUser,
  userId: testUser.id,
  credential: 'mcp-oauth',
  scopes: ['career:read', 'finance:read'],
} satisfies AuthContext;

async function createClient(app: Hono<AppContext>) {
  const transport = new StreamableHTTPClientTransport(new URL('http://localhost/api/mcp'), {
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      headers.set('authorization', 'Bearer test-token');
      return app.fetch(new Request(input, { ...init, headers }));
    },
  });
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  await client.connect(transport);
  return client;
}

describe('mcp server transport', () => {
  it('advertises career:read in protected resource metadata', async () => {
    const app = new Hono().route('/', oauthDiscoveryRoutes);
    const response = await app.request('/.well-known/oauth-protected-resource/api/mcp');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      scopes_supported: expect.arrayContaining(['career:read']),
    });
  });

  it('advertises career:read in authorization server metadata', async () => {
    const app = new Hono().route('/', oauthDiscoveryRoutes);
    const response = await app.request('/.well-known/oauth-authorization-server');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      scopes_supported: expect.arrayContaining(['career:read']),
    });
  });

  it('requires authentication at the route boundary', async () => {
    const app = createApp();
    const response = await app.fetch(new Request('http://localhost/api/mcp', { method: 'GET' }));

    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toContain('scope=');
    expect(response.headers.get('www-authenticate')).toContain('resource_metadata=');
    await expect(response.json()).resolves.toMatchObject({
      error: 'unauthorized',
    });
  });

  it('rejects an MCP token without career:read', async () => {
    const app = createApp({ ...mcpAuthContext, scopes: ['openid', 'profile'] });
    const response = await app.fetch(
      new Request('http://localhost/api/mcp', {
        method: 'GET',
        headers: { authorization: 'Bearer test-token', 'x-mcp-scopes': 'openid profile' },
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: 'insufficient_scope',
    });
  });

  it('does not authorize a Better Auth cookie session as MCP', async () => {
    const app = createApp({
      ...mcpAuthContext,
      credential: 'session',
      sessionId: 'session-123',
    });
    const response = await app.fetch(new Request('http://localhost/api/mcp', { method: 'GET' }));

    expect(response.status).toBe(401);
  });

  it('connects and initializes over streamable HTTP', async () => {
    const client = await createClient(createApp(mcpAuthContext));
    try {
      expect(client.getServerVersion()).toMatchObject({
        name: 'Hominem MCP',
        version: '1.0.0',
      });
    } finally {
      await client.close();
    }
  });

  it('lists registered career tools', async () => {
    const client = await createClient(createApp(mcpAuthContext));
    try {
      const tools = await client.listTools();
      const toolNames = tools.tools.map((t) => t.name);
      expect(toolNames).toContain('career_profile');
      expect(toolNames).toContain('career_engagements');
      expect(toolNames).toContain('career_wishlist_add');
    } finally {
      await client.close();
    }
  });

  it('advertises ChatGPT safety annotations and invocation status', async () => {
    const client = await createClient(createApp(mcpAuthContext));
    try {
      const tools = await client.listTools();
      const deleteTool = tools.tools.find((tool) => tool.name === 'career_wishlist_remove');
      const readTool = tools.tools.find((tool) => tool.name === 'career_engagements');

      expect(deleteTool?.annotations).toMatchObject({
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      });
      expect(deleteTool?._meta).toMatchObject({
        'openai/toolInvocation/invoking': expect.any(String),
        'openai/toolInvocation/invoked': expect.any(String),
      });
      expect(readTool?.annotations).toMatchObject({
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      });
    } finally {
      await client.close();
    }
  });

  it('requires only finance:read for finance tools', () => {
    const financeTools = listTools().filter((tool) => tool.name.startsWith('finance_'));

    expect(financeTools).not.toHaveLength(0);
    expect(
      financeTools.every((tool) => tool.scopes.length === 1 && tool.scopes[0] === 'finance:read'),
    ).toBe(true);
  });

  it('invokes a career tool with a scoped MCP token', async () => {
    const client = await createClient(createApp(mcpAuthContext));
    try {
      const result = await client.callTool({
        name: 'career_engagements',
        arguments: { limit: 1 },
      });

      expect(result.isError).not.toBe(true);
      expect(result.structuredContent).toMatchObject({ engagements: [] });
    } finally {
      await client.close();
    }
  });

  it('rejects a wishlist mutation without career:write', async () => {
    const client = await createClient(createApp(mcpAuthContext));
    try {
      const result = await client.callTool({
        name: 'career_wishlist_add',
        arguments: { company: 'Acme' },
      });

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: 'text', text: 'Missing required scope(s): career:write' },
      ]);
    } finally {
      await client.close();
    }
  });

  it('invokes the profile tool with an object-shaped result', async () => {
    const client = await createClient(createApp(mcpAuthContext));
    try {
      const result = await client.callTool({
        name: 'career_profile',
        arguments: {},
      });

      expect(result.isError).not.toBe(true);
      expect(result.structuredContent).toMatchObject({ profile: null });
    } finally {
      await client.close();
    }
  });

  it('rejects tool calls with invalid input', async () => {
    const client = await createClient(createApp(mcpAuthContext));
    try {
      const result = await client.callTool({
        name: 'career_engagements',
        arguments: { limit: 'not-a-number' },
      });

      expect(result.isError).toBe(true);
      expect(result.content).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringMatching(/-32602|validation|expected/i),
          }),
        ]),
      );
    } finally {
      await client.close();
    }
  });

  it('does not return internal tool errors to the client', async () => {
    registerTool(
      {
        name: 'failing_tool',
        title: 'Failing test tool',
        description: 'Fails for error redaction coverage.',
        inputSchema: z.object({}),
        outputSchema: z.object({ value: z.string() }),
        readOnly: true,
        scopes: ['career:read'],
        sensitivity: 'standard',
        resultCap: 1,
      },
      async () => {
        throw new Error('secret database detail');
      },
    );

    const client = await createClient(createApp(mcpAuthContext));
    try {
      const result = await client.callTool({
        name: 'failing_tool',
        arguments: {},
      });

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: 'text', text: 'Unable to complete the MCP tool request.' },
      ]);
      expect(JSON.stringify(result)).not.toContain('secret database detail');
    } finally {
      await client.close();
    }
  });

  it('returns a client error for malformed JSON-RPC requests', async () => {
    const app = createApp(mcpAuthContext);
    const response = await app.fetch(
      new Request('http://localhost/api/mcp', {
        method: 'POST',
        headers: {
          accept: 'application/json, text/event-stream',
          'content-type': 'application/json',
          authorization: 'Bearer test-token',
        },
        body: '{',
      }),
    );

    expect(response.status).toBe(400);
    expect(response.headers.get('content-type')).toMatch(/application\/json/);
  });
});
