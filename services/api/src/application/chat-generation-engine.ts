import { type AIUsageMetrics } from '@hominem/ai';
import {
  ChatClient,
  chatMessageJsonObjectSchema,
  chatMessageSnapshotSchema,
  type ChatMessageJsonObject,
  type GenerationHistoryEventPayload,
  type GenerationStreamEventPayload,
  type GenerationToolCall,
  type ToolResult,
} from '@hominem/chat';
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
    completionTokens: totals.completionTokens + next.completionTokens,
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
    liveEvents?: { accept: (event: GenerationStreamEventPayload) => Promise<void> | void };
    cancellation?: { isRequested: () => boolean | Promise<boolean> };
    // Overrides the interpreter's default per-command timeouts. Production
    // callers should leave this unset; it exists so tests can make a hung
    // port fail fast instead of waiting out the real defaults.
    effectTimeoutsMs?: ConstructorParameters<typeof ChatClient>[0]['effectTimeoutsMs'];
  },
): Promise<GenerationEngineResult> {
  let usage: AIUsageMetrics | null = null;
  const calls = new Map<string, GenerationToolCall>();
  const results = new Map<string, ToolResult>();
  let pendingPreview: Record<string, unknown> | null = null;
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

  const chat = new ChatClient({
    model,
    effectTimeoutsMs: input.effectTimeoutsMs,
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
        } catch {
          const result: ToolResult = {
            callId: call.id,
            toolName: call.name,
            content: JSON.stringify({ error: 'Tool call failed' }),
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
        } catch {
          return {
            callId: call.id,
            toolName: call.name,
            content: JSON.stringify({ error: 'Tool preview failed' }),
            error: true,
          };
        }
      },
    },
    lifecycle: {
      events: {
        persist: async (command) => {
          if (
            [
              'generation.started',
              'generation.committed',
              'generation.cancelled',
              'generation.failed',
            ].includes(command.event.type)
          ) {
            return;
          }
          const record = await input.eventStore?.append({
            event: command.event,
            idempotencyKey: command.idempotencyKey,
          });
          if (record) await input.durableEvents?.accept(record);
        },
        emit: async (event) => {
          if (event.type === 'text-delta') {
            await input.liveEvents?.accept({ type: 'text-delta', text: event.text });
          } else if (event.type === 'reasoning-delta') {
            await input.liveEvents?.accept({ type: 'reasoning-delta', text: event.text });
          } else if (event.type === 'tool-step') {
            await input.liveEvents?.accept(event);
          } else if (event.type === 'phase-changed') {
            await input.liveEvents?.accept({ type: 'phase-changed', phase: 'running' });
          }
        },
      },
      generation: {
        save: async (state) =>
          chatMessageSnapshotSchema.parse({
            id: `${input.generationId}:assistant`,
            chatId: input.chatId,
            userId: input.userId,
            role: 'assistant',
            content: state.assistantText,
            files: null,
            toolCalls: null,
            reasoning: state.reasoningText || null,
            parentMessageId: input.targetAssistantMessageId ?? null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
        stop: async () => undefined,
      },
      control: {
        isCancelled: input.cancellation?.isRequested,
      },
    },
  });

  const generation = chat.generations.create({
    id: input.generationId,
    context: {
      chatId: input.chatId,
      kind: input.generationKind ?? 'send',
      userMessageId: input.userMessageId ?? null,
      targetAssistantMessageId: input.targetAssistantMessageId ?? null,
      requestContext: {},
    },
    initialState: input.initialState,
    initialInput: input.initialInput,
  });
  const state = await generation.run();
  if (state.phase === 'failed') throw new Error(state.lastError ?? 'Generation failed');

  const pending = state.pendingConfirmation;
  return {
    assistantText: state.assistantText,
    reasoningText: state.reasoningText || null,
    toolCallRecords: state.toolCalls.map((call) =>
      toToolRecord(
        call,
        results.get(call.id) ??
          state.completedToolResults.find((result) => result.callId === call.id),
      ),
    ),
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
