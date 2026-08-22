import { type ChatFunctionTool, convertSchemaToJsonSchema } from '@hominem/ai';
import { logger } from '@hominem/telemetry';

import { ensureMcpToolsRegistered } from './register-tools';
import { listTools } from './tools';

/**
 * All registered MCP tools, converted to the JSON-Schema function-tool shape
 * OpenRouter expects. Write tools are included — tools flagged
 * `requiresConfirmation` are gated at execution time in
 * chat-completion-loop.ts, not hidden from the model here.
 *
 * Registration failure (e.g. a misconfigured domain module) degrades to no
 * tools rather than failing the whole chat request — the assistant just
 * answers without looking anything up.
 */
export async function getChatTools(): Promise<ChatFunctionTool[]> {
  try {
    await ensureMcpToolsRegistered();
  } catch (error) {
    logger.error('[chat] Failed to register MCP tools; continuing without tool-calling', {
      error,
    });
    return [];
  }

  return listTools().map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: convertSchemaToJsonSchema(tool.inputSchema) as Record<string, unknown>,
    },
  }));
}
