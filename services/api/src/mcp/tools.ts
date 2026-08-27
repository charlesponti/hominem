import { ValidationError } from '@hominem/db';
import type { CallToolResult } from '@modelcontextprotocol/server';
import * as z from 'zod';

import type { CapabilityDefinition } from '../application/capability';

export const CHAT_CAPABILITIES = [
  'calendar',
  'career',
  'collections',
  'finance',
  'health',
  'media',
  'memory',
  'people',
  'places',
  'social',
  'tags',
  'travel',
] as const;

export type ChatCapability = (typeof CHAT_CAPABILITIES)[number];

const capabilityByScope: Record<string, ChatCapability> = {
  'calendar:read': 'calendar',
  'career:read': 'career',
  'career:write': 'career',
  'collections:read': 'collections',
  'collections:write': 'collections',
  'finance:read': 'finance',
  'health:read': 'health',
  'media:read': 'media',
  'memory:read': 'memory',
  'memory:write': 'memory',
  'people:read': 'people',
  'places:read': 'places',
  'social:read': 'social',
  'tags:read': 'tags',
  'tags:write': 'tags',
  'travel:read': 'travel',
} as const;

export function getToolCapabilities(definition: CapabilityDefinition): ChatCapability[] {
  return [
    ...new Set(
      definition.scopes.flatMap((scope) => {
        const capability = capabilityByScope[scope];
        return capability ? [capability] : [];
      }),
    ),
  ];
}

export type McpToolResult = Omit<CallToolResult, 'structuredContent'> & {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent: Record<string, unknown> | null;
};

type RegisteredTool = {
  definition: CapabilityDefinition;
  invoke: (ownerUserId: string, input: unknown) => Promise<unknown>;
};

function toolResult(structuredContent: Record<string, unknown> | null): McpToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(structuredContent) }],
    structuredContent,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function enforceResultCap(
  result: Record<string, unknown> | null,
  toolName: string,
  resultCap: number,
) {
  if (!result) return;

  for (const [field, value] of Object.entries(result)) {
    if (Array.isArray(value) && value.length > resultCap) {
      throw new ValidationError(
        `MCP tool result exceeds its cap: ${toolName}.${field} (${resultCap})`,
      );
    }
  }
}

const tools = new Map<string, RegisteredTool>();

export function listTools(): CapabilityDefinition[] {
  return [...tools.values()].map(({ definition }) => definition);
}

export function listToolsForScopes(grantedScopes: readonly string[]): CapabilityDefinition[] {
  const granted = new Set(grantedScopes);
  return listTools().filter((tool) => tool.scopes.every((scope) => granted.has(scope)));
}

export function getToolDefinition(name: string): CapabilityDefinition | undefined {
  return tools.get(name)?.definition;
}

export function registerTool<TInputSchema extends z.ZodType, TOutputSchema extends z.ZodType>(
  definition: CapabilityDefinition<string, TInputSchema, TOutputSchema>,
  invoke: (ownerUserId: string, input: z.output<TInputSchema>) => Promise<z.output<TOutputSchema>>,
): void {
  if (tools.has(definition.name)) {
    throw new ValidationError(`MCP tool is already registered: ${definition.name}`);
  }

  tools.set(definition.name, {
    definition,
    invoke: (ownerUserId, input) => invoke(ownerUserId, definition.inputSchema.parse(input)),
  });
}

export async function callTool(
  ownerUserId: string,
  name: string,
  input: unknown,
): Promise<McpToolResult> {
  const implementation = tools.get(name);
  if (!implementation) {
    throw new ValidationError(`Unknown MCP tool: ${name}`);
  }

  const structuredContent = await implementation.invoke(ownerUserId, input);
  const parsedOutput = implementation.definition.outputSchema.parse(structuredContent);

  if (parsedOutput === null) {
    return toolResult(null);
  }

  if (!isRecord(parsedOutput)) {
    throw new ValidationError(`MCP tool returned invalid structured content: ${name}`);
  }

  const result = parsedOutput;
  enforceResultCap(result, name, implementation.definition.resultCap);
  return toolResult(result);
}
