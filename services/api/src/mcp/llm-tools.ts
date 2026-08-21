import { type ChatFunctionTool, convertSchemaToJsonSchema } from '@hominem/ai';
import { logger } from '@hominem/telemetry';

import { ensureMcpToolsRegistered } from './register-tools';
import { listTools } from './tools';

/**
 * Read-only MCP tools, converted to the JSON-Schema function-tool shape
 * OpenRouter expects. Write/destructive tools are intentionally excluded —
 * the chat assistant can look things up but not yet act.
 *
 * Registration failure (e.g. a misconfigured domain module) degrades to no
 * tools rather than failing the whole chat request — the assistant just
 * answers without looking anything up.
 */
export async function getReadOnlyChatTools(): Promise<ChatFunctionTool[]> {
  try {
    await ensureMcpToolsRegistered();
  } catch (error) {
    logger.error('[chat] Failed to register MCP tools; continuing without tool-calling', {
      error,
    });
    return [];
  }

  return listTools()
    .filter((tool) => tool.readOnly)
    .map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: convertSchemaToJsonSchema(tool.inputSchema) as Record<string, unknown>,
      },
    }));
}
