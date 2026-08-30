import { type AIUsageMetrics } from '@hominem/ai';
import {
  ChatClient,
  type GenerationHistoryEventPayload,
  type GenerationToolCall,
  type ToolResult,
} from '@hominem/chat';
import type { ChatGenerationEventRecord, ChatMessageToolCallRecord } from '@hominem/db';

import { callTool, getToolDefinition } from '../mcp/tool-registry';
import { OpenRouterChatModel } from './chat-generation-provider';
import type { ChatGenerationEffectStore } from './chat-generation-tools';
import type {
  ChatGenerationLiveEvent,
  RunCompletionWithToolsInput,
  RunCompletionWithToolsResult,
} from './chat-generation-types';

function parseArguments(call: GenerationToolCall): Record<string, unknown> {
  if (!call.arguments) return {};
  const value: unknown = JSON.parse(call.arguments);
  if (!isRecord(value)) {
    throw new Error(`Invalid tool arguments for ${call.name}`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toToolRecord(call: GenerationToolCall, result?: ToolResult): ChatMessageToolCallRecord {
  let args: Record<string, unknown> = {};
  try {
    args = parseArguments(call);
  } catch {
    // The malformed argument string remains visible in the model transcript;
    // the tool result carries the validation error.
  }
  return {
    toolName: call.name,
    type: 'tool-call',
    toolCallId: call.id,
    args,
    status: result ? (result.error ? 'failed' : 'completed') : 'pending',
  };
}

function addUsage(
  totals: AIUsageMetrics | null,
  next: AIUsageMetrics | null,
): AIUsageMetrics | null {
  if (!next) return totals;
  if (!totals) return next;
  return {
    ...next,
    promptTokens: totals.promptTokens + next.promptTokens,
    completionTokens: totals.completionTokens + next.completionTokens,
    totalTokens: totals.totalTokens + next.totalTokens,
    costUsd:
      totals.costUsd !== null || next.costUsd !== null
        ? (totals.costUsd ?? 0) + (next.costUsd ?? 0)
        : null,
  };
}

function mapLiveEvent(
  event: Parameters<NonNullable<RunCompletionWithToolsInput['onEvent']>>[0],
): ChatGenerationLiveEvent {
  return event;
}

export async function runChatGeneration(
  input: RunCompletionWithToolsInput & {
    generationId: string;
    chatId: string;
    effectStore?: ChatGenerationEffectStore;
    persistEvent?: (input: {
      event: GenerationHistoryEventPayload;
      idempotencyKey: string;
    }) => Promise<ChatGenerationEventRecord | null>;
    persistStarted?: boolean;
    persistTerminal?: boolean;
    onDurableEvent?: (event: ChatGenerationEventRecord) => Promise<void> | void;
    isCancelled?: () => boolean | Promise<boolean>;
  },
): Promise<RunCompletionWithToolsResult> {
  let usage: AIUsageMetrics | null = null;
  const calls = new Map<string, GenerationToolCall>();
  const results = new Map<string, ToolResult>();
  let pendingPreview: Record<string, unknown> | null = null;
  const runtime = input.toolRuntime ?? { callTool, getToolDefinition };
  const model = new OpenRouterChatModel({
    model: input.model,
    messages: input.messages,
    tools: input.tools,
    maxTokens: input.maxTokens,
    reasoning: input.reasoning,
    requiresToolCall: input.requiresToolCall,
    requiresConfirmation: (name) => runtime?.getToolDefinition(name)?.requiresConfirmation ?? false,
    onUsage: (next) => {
      usage = addUsage(usage, next);
    },
  });

  const chat = new ChatClient({
    model,
    tools: {
      execute: async ({ call, idempotencyKey }) => {
        calls.set(call.id, call);
        const stored = await input.effectStore?.get({
          generationId: input.generationId,
          idempotencyKey,
          toolName: call.name,
        });
        if (stored) {
          results.set(call.id, stored);
          return stored;
        }
        try {
          const value = await runtime.callTool(input.userId, call.name, parseArguments(call), {
            idempotencyKey,
          });
          const result: ToolResult = {
            callId: call.id,
            toolName: call.name,
            content: value.content[0]?.text ?? 'null',
            error: false,
          };
          results.set(call.id, result);
          return input.effectStore
            ? await input.effectStore.save({
                generationId: input.generationId,
                idempotencyKey,
                toolName: call.name,
                result,
              })
            : result;
        } catch (error) {
          const result: ToolResult = {
            callId: call.id,
            toolName: call.name,
            content: JSON.stringify({
              error: error instanceof Error ? error.message : 'Tool call failed',
            }),
            error: true,
          };
          results.set(call.id, result);
          return input.effectStore
            ? await input.effectStore.save({
                generationId: input.generationId,
                idempotencyKey,
                toolName: call.name,
                result,
              })
            : result;
        }
      },
      preview: async ({ call }) => {
        calls.set(call.id, call);
        try {
          const definition = runtime.getToolDefinition(call.name);
          const value = definition?.preview
            ? await definition.preview(input.userId, parseArguments(call))
            : null;
          pendingPreview = value;
          return {
            callId: call.id,
            toolName: call.name,
            content: JSON.stringify(value),
            error: false,
          };
        } catch (error) {
          return {
            callId: call.id,
            toolName: call.name,
            content: JSON.stringify({
              error: error instanceof Error ? error.message : 'Preview failed',
            }),
            error: true,
          };
        }
      },
    },
    lifecycle: {
      events: {
        persist: async (command) => {
          if (command.event.type === 'generation.started' && input.persistStarted === false) {
            return;
          }
          if (
            input.persistTerminal === false &&
            ['generation.committed', 'generation.cancelled', 'generation.failed'].includes(
              command.event.type,
            )
          ) {
            return;
          }
          const record = await input.persistEvent?.({
            event: command.event,
            idempotencyKey: command.idempotencyKey,
          });
          if (record) await input.onDurableEvent?.(record);
        },
        emit: async (event) => {
          if (event.type === 'text-delta') {
            await input.onEvent?.({ type: 'text-delta', text: event.text });
          } else if (event.type === 'reasoning-delta') {
            await input.onEvent?.({ type: 'reasoning-delta', text: event.text });
          } else if (event.type === 'tool-step') {
            await input.onEvent?.(event);
          } else if (event.type === 'phase-changed') {
            await input.onEvent?.(mapLiveEvent({ type: 'phase', phase: 'generating' }));
          }
        },
      },
      generation: {
        save: async (state) => ({
          id: `${input.generationId}:assistant`,
          chatId: input.chatId,
          role: 'assistant',
          content: state.assistantText,
          reasoning: state.reasoningText || null,
        }),
        stop: async () => undefined,
      },
      control: {
        isCancelled: input.isCancelled,
      },
    },
  });

  const generation = chat.generations.create({
    id: input.generationId,
    context: {
      chatId: input.chatId,
      kind: 'send',
      userMessageId: null,
      targetAssistantMessageId: null,
      requestContext: {},
    },
  });
  const state = await generation.run();
  if (state.phase === 'failed') throw new Error(state.lastError ?? 'Generation failed');

  const pending = state.pendingConfirmation;
  return {
    assistantText: state.assistantText,
    reasoningText: state.reasoningText || null,
    toolCallRecords: state.toolCalls.map((call) => toToolRecord(call, results.get(call.id))),
    usage,
    pendingToolCall: pending
      ? {
          toolCallId: pending.id,
          toolName: pending.name,
          args: parseArguments(pending),
          preview: pendingPreview,
        }
      : null,
  };
}
