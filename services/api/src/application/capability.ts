import type { z } from 'zod';

type CapabilityTransport = 'rpc' | 'mcp';
type Sensitivity = 'standard' | 'sensitive' | 'highly_sensitive' | 'public';

export interface CapabilityDefinition<
  Name extends string = string,
  InputSchema extends z.ZodType = z.ZodType,
  OutputSchema extends z.ZodType = z.ZodType,
> {
  name: Name;
  title: string;
  description: string;
  inputSchema: InputSchema;
  outputSchema: OutputSchema;
  readOnly: boolean;
  scopes: readonly string[];
  sensitivity: Sensitivity;
  resultCap: number;
  transports: readonly CapabilityTransport[];
}

export type CapabilityInput<T extends CapabilityDefinition> = z.infer<T['inputSchema']>;
export type CapabilityOutput<T extends CapabilityDefinition> = z.infer<T['outputSchema']>;

export function defineCapability<const T extends CapabilityDefinition>(definition: T): T {
  return definition;
}

export function parseCapabilityInput<T extends CapabilityDefinition>(
  definition: T,
  input: unknown,
): CapabilityInput<T> {
  return definition.inputSchema.parse(input) as CapabilityInput<T>;
}

export function parseCapabilityOutput<T extends CapabilityDefinition>(
  definition: T,
  output: unknown,
): CapabilityOutput<T> {
  return definition.outputSchema.parse(output) as CapabilityOutput<T>;
}

export function assertReadOnlyMcpCapability(definition: CapabilityDefinition): void {
  if (!definition.transports.includes('mcp')) {
    return;
  }

  if (!definition.readOnly) {
    throw new Error(`MCP capability must be read-only: ${definition.name}`);
  }

  if (definition.resultCap < 1 || definition.resultCap > 50) {
    throw new Error(`MCP capability resultCap must be between 1 and 50: ${definition.name}`);
  }
}
