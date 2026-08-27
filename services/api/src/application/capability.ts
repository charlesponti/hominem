import type { z } from 'zod';

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
  resultCap: number;
  destructive?: boolean;
  idempotent?: boolean;
  openWorld?: boolean;
  invoking?: string;
  invoked?: string;
  requiresConfirmation?: boolean;
  preview?: (
    ownerUserId: string,
    input: Record<string, unknown>,
  ) => Promise<Record<string, unknown> | null>;
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
