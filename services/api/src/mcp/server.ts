import { logger } from '@hominem/telemetry';
import {
  createMcpHandler,
  McpServer,
  type AuthInfo,
  type CallToolResult,
} from '@modelcontextprotocol/server';
import type { Context } from 'hono';

import type { AuthContext } from '../auth/types';
import { UnauthorizedError } from '../errors';
import { callTool, listTools, type McpToolDefinition } from './tools';

export type McpHonoEnv = {
  Variables: {
    auth?: AuthContext;
  };
};

interface McpAuthInfoExtra {
  ownerUserId: string;
  sessionId: string | null;
}

function createErrorResult(message: string): CallToolResult {
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  };
}

const PUBLIC_TOOL_ERROR = 'Unable to complete the MCP tool request.';

function resolveRequestContext(authInfo?: AuthInfo) {
  const extra = authInfo?.extra as Partial<McpAuthInfoExtra> | undefined;
  const ownerUserId = extra?.ownerUserId;
  if (!ownerUserId) return null;
  return { ownerUserId, grantedScopes: new Set(authInfo?.scopes ?? []) };
}

function hasRequiredScopes(grantedScopes: Set<string>, requiredScopes: readonly string[]): boolean {
  return requiredScopes.every((scope) => grantedScopes.has(scope));
}

function createToolHandler(definition: McpToolDefinition, fallbackAuthInfo?: AuthInfo) {
  return async (args: unknown, extra: { authInfo?: AuthInfo }) => {
    const context = resolveRequestContext(extra.authInfo ?? fallbackAuthInfo);
    if (!context) {
      return createErrorResult('Authentication required');
    }

    if (!hasRequiredScopes(context.grantedScopes, definition.scopes)) {
      return createErrorResult(`Missing required scope(s): ${definition.scopes.join(', ')}`);
    }

    try {
      return (await callTool(context.ownerUserId, definition.name, args)) as CallToolResult;
    } catch (error) {
      logger.warn('[mcp] tool invocation failed', {
        tool: definition.name,
        userId: context.ownerUserId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return createErrorResult(PUBLIC_TOOL_ERROR);
    }
  };
}

function createMcpServer(authInfo?: AuthInfo) {
  const mcpServer = new McpServer(
    { name: 'Hominem MCP', version: '1.0.0' },
    { instructions: 'MCP tools for authenticated Hominem users.' },
  );

  for (const definition of listTools()) {
    const destructive = definition.destructive ?? /(?:delete|remove)/i.test(definition.name);
    const idempotent =
      definition.idempotent ?? /(?:delete|remove|update|save)/i.test(definition.name);

    mcpServer.registerTool(
      definition.name,
      {
        title: definition.title,
        description: definition.description,
        inputSchema: definition.inputSchema as never,
        outputSchema: definition.outputSchema as never,
        annotations: {
          readOnlyHint: definition.readOnly,
          destructiveHint: destructive,
          idempotentHint: idempotent,
          openWorldHint: definition.openWorld ?? false,
        },
        _meta: {
          'openai/toolInvocation/invoking': definition.invoking ?? `${definition.title}…`,
          'openai/toolInvocation/invoked': definition.invoked ?? `${definition.title} complete.`,
        },
      },
      createToolHandler(definition, authInfo) as never,
    );
  }

  return mcpServer;
}

const mcpHandler = createMcpHandler(({ authInfo }) => createMcpServer(authInfo), {
  legacy: 'stateless',
  responseMode: 'json',
});

export async function handleMcpRequestWithSession(c: Context<McpHonoEnv>): Promise<Response> {
  const auth = c.get('auth');

  if (!auth) {
    throw new UnauthorizedError('MCP session required');
  }

  const authInfo: AuthInfo = {
    token: c.req.header('authorization')?.replace(/^Bearer\s+/i, '') ?? '',
    clientId: auth.clientId ?? 'hominem-mcp',
    scopes: auth.scopes,
    extra: {
      ownerUserId: auth.userId,
      sessionId: auth.sessionId ?? null,
    } satisfies McpAuthInfoExtra,
  };

  return mcpHandler.fetch(c.req.raw, { authInfo });
}
