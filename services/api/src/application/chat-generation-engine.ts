import { type AIUsageMetrics } from '@hominem/ai';
import {
  chatMessageJsonObjectSchema,
  chatMessageSnapshotSchema,
  type ChatMessageJsonObject,
  type GenerationDeltaEventPayload,
  type GenerationHistoryEventPayload,
  type GenerationToolCall,
  type ToolResult,
} from '@hominem/chat';
import type { ChatServerRuntimeOptions } from '@hominem/chat/server';
import { ChatServerRuntime } from '@hominem/chat/server';
import type { ChatGenerationEventRecord, ChatMessageToolCallRecord } from '@hominem/db';

import { callTool, getToolDefinition } from '../mcp/tool-registry';
import { OpenRouterChatModel } from './chat-generation-provider';
import type { ChatGenerationEffectStore } from './chat-generation-tools';
import type { GenerationEngineInput, GenerationEngineResult } from './chat-generation-types';

export class ToolInputError extends Error {
  readonly category = 'tool_input';

  constructor(toolName: string) {
    super(`Tool arguments are invalid for ${toolName}`);
    this.name = 'ToolInputError';
  }
}

const chatServerRuntime = new ChatServerRuntime<ChatGenerationEventRecord>();

function parseArguments(call: GenerationToolCall): ChatMessageJsonObject {
  if (!call.arguments) return {};
  let value: unknown;
  try {
    value = JSON.parse(call.arguments);
  } catch {
    throw new ToolInputError(call.name);
  }
  const parsed = chatMessageJsonObjectSchema.safeParse(value);
  if (!parsed.success) {
    throw new ToolInputError(call.name);
  }
  return parsed.data;
}

function toToolRecord(call: GenerationToolCall, result?: ToolResult): ChatMessageToolCallRecord {
  let args: ChatMessageJsonObject = {};
  try {
    args = parseArguments(call);
  } catch {
    // swallow it — the bad argument string is still visible in the model transcript,
    // and the tool result will carry the validation error
  }
  return {
    toolName: call.name,
    type: 'tool-call',
    toolCallId: call.id,
    args,
    confirmationStatus: result ? undefined : 'pending',
    executionStatus: result ? (result.error ? 'failed' : 'completed') : 'pending',
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
    outputTokens: totals.outputTokens + next.outputTokens,
    totalTokens: totals.totalTokens + next.totalTokens,
    costUsd:
      totals.costUsd !== null || next.costUsd !== null
        ? (totals.costUsd ?? 0) + (next.costUsd ?? 0)
        : null,
  };
}

export async function executeGenerationTurn(
  input: GenerationEngineInput & {
    generationId: string;
    chatId: string;
    generationKind?: 'send' | 'start' | 'regenerate';
    userMessageId?: string | null;
    targetAssistantMessageId?: string | null;
    effectStore?: ChatGenerationEffectStore;
    eventStore?: {
      append: (input: {
        event: GenerationHistoryEventPayload;
        idempotencyKey: string;
      }) => Promise<ChatGenerationEventRecord | null>;
    };
    durableEvents?: { accept: (event: ChatGenerationEventRecord) => Promise<void> | void };
    liveEvents?: { accept: (event: GenerationDeltaEventPayload) => Promise<void> | void };
    cancellation?: { isRequested: () => boolean | Promise<boolean> };
    // Overrides the interpreter's default per-command timeouts. Production
    // callers should leave this unset; it exists so tests can make a hung
    // port fail fast instead of waiting out the real defaults.
    effectTimeoutsMs?: ChatServerRuntimeOptions['effectTimeoutsMs'];
  },
): Promise<GenerationEngineResult> {
  let usage: AIUsageMetrics | null = null;
  const runtime = input.toolRuntime ?? { callTool, getToolDefinition };
  const modelOptions = {
    model: input.model,
    messages: input.messages,
    tools: input.tools,
    maxTokens: input.maxTokens,
    reasoning: input.reasoning,
    requiresToolCall: input.initialState ? false : input.requiresToolCall,
    requiresConfirmation: (name: string) =>
      runtime?.getToolDefinition(name)?.requiresConfirmation ?? false,
    onUsage: (next: AIUsageMetrics | null) => {
      usage = addUsage(usage, next);
    },
  };
  const model = input.modelFactory
    ? input.modelFactory(modelOptions)
    : new OpenRouterChatModel(modelOptions);

  const operation: ChatServerRuntimeOptions<ChatGenerationEventRecord> = {
    provider: () => model,
    effectTimeoutsMs: input.effectTimeoutsMs,
    tools: {
      getDefinition: (toolName) => {
        const definition = runtime.getToolDefinition(toolName);
        return definition
          ? {
              requiresConfirmation: definition.requiresConfirmation,
              preview: async (call, context) => {
                try {
                  const value = definition.preview
                    ? await definition.preview(context.userId, parseArguments(call))
                    : null;
                  return {
                    callId: call.id,
                    toolName: call.name,
                    content: JSON.stringify(value),
                    error: false,
                  };
                } catch {
                  return {
                    callId: call.id,
                    toolName: call.name,
                    content: JSON.stringify({ error: 'Tool preview failed' }),
                    error: true,
                  };
                }
              },
            }
          : undefined;
      },
      execute: async ({ call, context: toolContext }) => {
        const idempotencyKey = toolContext.idempotencyKey;
        const stored = await input.effectStore?.get({
          generationId: input.generationId,
          idempotencyKey,
          toolName: call.name,
        });
        if (stored) {
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
          return input.effectStore
            ? await input.effectStore.save({
                generationId: input.generationId,
                idempotencyKey,
                toolName: call.name,
                result,
              })
            : result;
        } catch {
          const result: ToolResult = {
            callId: call.id,
            toolName: call.name,
            content: JSON.stringify({ error: 'Tool call failed' }),
            error: true,
          };
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
    },
    store: {
      appendEvent: async ({ event, idempotencyKey }) => {
        const UNSOPPORTED_EVENT_TYPES = [
          'generation.started',
          'generation.committed',
          'generation.cancelled',
          'generation.failed',
        ];
        if (UNSOPPORTED_EVENT_TYPES.includes(event.type)) {
          return null;
        }
        if (
          event.type === 'generation.phase_changed' &&
          (event.phase === 'running' || event.phase === 'saving')
        ) {
          return null;
        }
        const record = await input.eventStore?.append({ event, idempotencyKey });
        if (record) await input.durableEvents?.accept(record);
        return record ?? null;
      },
      getEffect: async ({ generationId, idempotencyKey, toolName }) =>
        input.effectStore?.get({ generationId, idempotencyKey, toolName }) ?? null,
      saveEffect: async ({ generationId, idempotencyKey, toolName, result }) =>
        input.effectStore
          ? input.effectStore.save({ generationId, idempotencyKey, toolName, result })
          : result,
      saveGeneration: async (state) =>
        chatMessageSnapshotSchema.parse({
          id: `${input.generationId}:assistant`,
          chatId: input.chatId,
          userId: input.userId,
          role: 'assistant',
          content: state.state.assistantText,
          files: null,
          toolCalls: null,
          reasoning: state.state.reasoningText || null,
          parentMessageId: input.targetAssistantMessageId ?? null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      stopGeneration: async () => undefined,
    },
    emit: async (event) => {
      await input.liveEvents?.accept(event);
    },
    isCancelled: () => input.cancellation?.isRequested?.() ?? false,
    context: input.context
      ? {
          recordCompletion: (completion) =>
            input.context!.recordCompletion({
              ...completion,
              usage: completion.usage as AIUsageMetrics,
            }),
        }
      : undefined,
  };

  const result = await chatServerRuntime.run(
    {
      generationId: input.generationId,
      chatId: input.chatId,
      userId: input.userId,
      model: {
        model: input.model,
        messages: input.messages,
        tools: input.tools,
        maxTokens: input.maxTokens,
        reasoning: input.reasoning,
        requiresToolCall: input.initialState ? false : input.requiresToolCall,
        onUsage: (next) => modelOptions.onUsage?.(next as AIUsageMetrics | null),
      },
      startContext: {
        chatId: input.chatId,
        kind: input.generationKind ?? 'send',
        userMessageId: input.userMessageId ?? null,
        targetAssistantMessageId: input.targetAssistantMessageId ?? null,
        requestContext: {},
      },
      initialState: input.initialState,
      initialInput: input.initialInput,
      targetAssistantMessageId: input.targetAssistantMessageId,
    },
    operation,
  );
  const state = result.state;
  if (state.phase === 'failed') throw new Error(state.lastError ?? 'Generation failed');

  const pending = state.pendingConfirmation;
  return {
    assistantText: state.assistantText,
    reasoningText: state.reasoningText || null,
    toolCallRecords: state.toolCalls.map((call) =>
      toToolRecord(
        call,
        result.toolResults.get(call.id) ??
          state.completedToolResults.find((toolResult) => toolResult.callId === call.id),
      ),
    ),
    usage,
    pendingToolCall: pending
      ? {
          toolCallId: pending.id,
          toolName: pending.name,
          args: parseArguments(pending),
          preview: result.pendingPreview ? JSON.parse(result.pendingPreview.content) : null,
        }
      : null,
  };
}
