import { logger } from '@hominem/telemetry';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  WebStandardStreamableHTTPServerTransport,
  type WebStandardStreamableHTTPServerTransportOptions,
} from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type {
  CallToolResult,
  ServerNotification,
  ServerRequest,
} from '@modelcontextprotocol/sdk/types.js';
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

const transportOptions: WebStandardStreamableHTTPServerTransportOptions = {
  sessionIdGenerator: undefined,
  enableJsonResponse: true,
};

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

function createToolHandler(definition: McpToolDefinition) {
  return async (args: unknown, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => {
    const context = resolveRequestContext(extra.authInfo);
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

function createMcpServer() {
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
        inputSchema: definition.inputSchema,
        outputSchema: definition.outputSchema,
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
      createToolHandler(definition),
    );
  }

  return mcpServer;
}

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

  const transport = new WebStandardStreamableHTTPServerTransport(transportOptions);
  const mcpServer = createMcpServer();
  await mcpServer.connect(transport);

  return transport.handleRequest(c.req.raw, { authInfo });
}
