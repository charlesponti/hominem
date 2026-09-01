import type { ChatMessageJsonObject } from '@hominem/chat';
import type { z } from 'zod';

// The single source of truth for capability domains and the scopes built from them.
// A tool's `scopes` are always `${capability}:${action}` — narrowing to this template
// type (rather than `string[]`) turns a typo'd scope into a compile error instead of a
// tool that silently drops out of chat-tool routing at runtime.
export const CAPABILITIES = [
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

export type Capability = (typeof CAPABILITIES)[number];
export type ScopeAction = 'read' | 'write';
export type Scope = `${Capability}:${ScopeAction}`;

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
  scopes: readonly Scope[];
  resultCap: number;
  destructive?: boolean;
  idempotent?: boolean;
  openWorld?: boolean;
  invoking?: string;
  invoked?: string;
  requiresConfirmation?: boolean;
  // `ChatMessageJsonObject` (not `Record<string, unknown>`) because a tool's preview
  // is persisted straight into `ChatMessageToolCallRecord.preview`, whose JSON-column
  // shape is the actual constraint here — narrowing to it here surfaces a
  // non-serializable preview value at the definition site instead of at the DB write.
  preview?: (
    ownerUserId: string,
    input: ChatMessageJsonObject,
  ) => Promise<ChatMessageJsonObject | null>;
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
