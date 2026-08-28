import { type GenerationState, type GenerationToolCall, type ToolResult } from '@hominem/chat';

import { callTool, getToolDefinition } from '../mcp/tool-registry';

export type ChatGenerationTools = {
  execute: (input: {
    call: GenerationToolCall;
    idempotencyKey: string;
    state: GenerationState;
  }) => Promise<ToolResult>;
  preview: (input: {
    call: GenerationToolCall;
    idempotencyKey: string;
    state: GenerationState;
  }) => Promise<ToolResult>;
};

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

function parseArguments(call: GenerationToolCall): Record<string, unknown> {
  if (!call.arguments) return {};
  const parsed: unknown = JSON.parse(call.arguments);
  if (!isRecord(parsed)) {
    throw new Error(`Invalid tool arguments for ${call.name}`);
  }
  return parsed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function result(call: GenerationToolCall, content: string, error: boolean): ToolResult {
  return { callId: call.id, toolName: call.name, content, error };
}

export function createChatGenerationTools(input: {
  userId: string;
  generationId: string;
  effectStore?: ChatGenerationEffectStore;
}): ChatGenerationTools {
  return {
    async execute({ call, idempotencyKey }) {
      const stored = await input.effectStore?.get({
        generationId: input.generationId,
        idempotencyKey,
        toolName: call.name,
      });
      if (stored) return stored;

      let computed: ToolResult;
      try {
        const toolResult = await callTool(input.userId, call.name, parseArguments(call), {
          idempotencyKey,
        });
        computed = result(call, toolResult.content[0]?.text ?? 'null', false);
      } catch (error) {
        computed = result(
          call,
          JSON.stringify({ error: error instanceof Error ? error.message : 'Tool call failed' }),
          true,
        );
      }
      return input.effectStore
        ? input.effectStore.save({
            generationId: input.generationId,
            idempotencyKey,
            toolName: call.name,
            result: computed,
          })
        : computed;
    },
    async preview({ call }) {
      try {
        const definition = getToolDefinition(call.name);
        const preview = definition?.preview
          ? await definition.preview(input.userId, parseArguments(call))
          : null;
        return result(call, JSON.stringify(preview), false);
      } catch (error) {
        return result(
          call,
          JSON.stringify({ error: error instanceof Error ? error.message : 'Preview failed' }),
          true,
        );
      }
    },
  };
}
