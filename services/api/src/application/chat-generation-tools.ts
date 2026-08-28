import type { ToolResult } from '@hominem/chat';

export type ChatGenerationEffectStore = {
  get: (input: {
    generationId: string;
    idempotencyKey: string;
    toolName: string;
  }) => Promise<ToolResult | null>;
  save: (input: {
    generationId: string;
    idempotencyKey: string;
    toolName: string;
    result: ToolResult;
  }) => Promise<ToolResult>;
};
