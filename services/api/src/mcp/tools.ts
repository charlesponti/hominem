import { ValidationError } from '@hominem/db';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import * as z from 'zod';

import type { CapabilityDefinition } from '../application/capability';

export interface McpToolDefinition {
  name: string;
  title: string;
  description: string;
  inputSchema: z.ZodType;
  outputSchema: z.ZodType;
  readOnly: true;
  scopes: readonly string[];
  sensitivity: CapabilityDefinition['sensitivity'];
  resultCap: number;
}

export type McpToolResult = Omit<CallToolResult, 'structuredContent'> & {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent: Record<string, unknown> | null;
};

type ToolImplementation = {
  definition: McpToolDefinition;
  invoke: (ownerUserId: string, input: unknown) => Promise<unknown>;
};

function toolResult(structuredContent: Record<string, unknown> | null): McpToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(structuredContent) }],
    structuredContent,
  };
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

const tools = new Map<string, ToolImplementation>();

export function listTools(): McpToolDefinition[] {
  return [...tools.values()].map((t) => t.definition);
}

export function registerTool(
  name: string,
  definition: McpToolDefinition,
  invoke: (ownerUserId: string, input: unknown) => Promise<unknown>,
): void {
  tools.set(name, { definition, invoke });
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

  const parsedInput = implementation.definition.inputSchema.parse(input);
  const structuredContent = await implementation.invoke(ownerUserId, parsedInput);
  const parsedOutput = implementation.definition.outputSchema.parse(structuredContent);

  if (parsedOutput === null) {
    return toolResult(null);
  }

  if (
    parsedOutput === undefined ||
    typeof parsedOutput !== 'object' ||
    Array.isArray(parsedOutput)
  ) {
    throw new ValidationError(`MCP tool returned invalid structured content: ${name}`);
  }

  const result = parsedOutput as Record<string, unknown>;
  enforceResultCap(result, name, implementation.definition.resultCap);
  return toolResult(result);
}
