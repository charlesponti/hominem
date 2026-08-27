import {
  createStructuredChatCompletion,
  type AIUsageMetrics,
  type ChatFunctionTool,
  type ChatMessages,
  convertSchemaToJsonSchema,
} from '@hominem/ai';
import { logger } from '@hominem/telemetry';
import * as z from 'zod';

import type { CapabilityDefinition } from '../application/capability';
import { ensureMcpToolsRegistered } from './register-tools';
import {
  CHAT_CAPABILITIES,
  type ChatCapability,
  getToolCapabilities,
  listTools,
} from './tool-registry';

const chatToolPlanSchema = z.object({
  capabilities: z.array(z.enum(CHAT_CAPABILITIES)).max(CHAT_CAPABILITIES.length),
  requiresLookup: z.boolean(),
});

export type ChatToolPlan = {
  capabilities: ChatCapability[];
  requiresLookup: boolean;
  tools: ChatFunctionTool[];
  usage: AIUsageMetrics | null;
};

const ROUTING_PROMPT = `Classify whether the latest user request needs current private Hominem data.\n\nUse requiresLookup=true for requests asking about the user's saved, current, or historical data. Select every relevant capability; when ambiguous, include each plausible capability. Use requiresLookup=false for general knowledge, writing, and conversation. Never select a capability merely because it could be useful.\n\nCapabilities: calendar (events), travel (trips), career (career data), collections (any saved entities), finance, health, media (watching/activity), memory, people, places, social, tags.`;

type ChatFunctionToolDefinition = Extract<ChatFunctionTool, { function: unknown }>;

function toChatTool(tool: CapabilityDefinition): ChatFunctionToolDefinition {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: convertSchemaToJsonSchema(tool.inputSchema) as Record<string, unknown>,
    },
  };
}

let chatToolProjection: {
  definitions: readonly CapabilityDefinition[];
  tools: readonly ChatFunctionToolDefinition[];
} | null = null;

function getChatToolProjection(
  definitions: readonly CapabilityDefinition[],
): readonly ChatFunctionToolDefinition[] {
  if (chatToolProjection?.definitions === definitions) return chatToolProjection.tools;

  const tools = definitions.map(toChatTool);
  chatToolProjection = { definitions, tools };
  return tools;
}

/**
 * All registered MCP tools, converted to the JSON-Schema function-tool shape
 * OpenRouter expects. Write tools are included — tools flagged
 * `requiresConfirmation` are gated at execution time in
 * chat-completion-loop.ts, not hidden from the model here.
 *
 * Registration failures are surfaced to the caller so a private-data request
 * can never silently degrade into an ungrounded answer.
 */
export async function getChatTools(): Promise<ChatFunctionTool[]> {
  await ensureMcpToolsRegistered();
  return [...getChatToolProjection(listTools())];
}

export async function planChatTools(input: {
  model: string;
  messages: ChatMessages[];
}): Promise<ChatToolPlan> {
  await ensureMcpToolsRegistered();
  const definitions = listTools();
  const projectedTools = getChatToolProjection(definitions);
  const { output, usage } = await createStructuredChatCompletion({
    model: input.model,
    messages: [
      { role: 'system', content: ROUTING_PROMPT },
      ...input.messages.filter((message) => message.role !== 'tool'),
    ],
    schema: chatToolPlanSchema,
    schemaName: 'chat_tool_plan',
    temperature: 0,
    maxCompletionTokens: 120,
  });
  const capabilities: ChatCapability[] = [...new Set(output.capabilities)];
  const selectedCapabilities = new Set(capabilities);
  const tools = definitions.flatMap((definition, index) =>
    getToolCapabilities(definition).some((capability) => selectedCapabilities.has(capability))
      ? [projectedTools[index]]
      : [],
  );
  if (output.requiresLookup && tools.length === 0) {
    throw new Error('No eligible tool is available for this private-data request');
  }
  logger.info('chat_tool_plan', {
    model: input.model,
    capabilities,
    requiresLookup: output.requiresLookup,
    candidateTools: tools.map((tool) => tool.function.name),
  });
  return { capabilities, requiresLookup: output.requiresLookup, tools, usage };
}
