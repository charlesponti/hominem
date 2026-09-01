import {
  type AIUsageMetrics,
  type ChatFunctionTool,
  type ChatMessages,
  type ChatRequest,
  type ChatStreamToolCall,
  getChatCompletionUsage,
  OpenRouterRequestError,
  streamChatCompletion,
} from '@hominem/ai';
import type { ChatMessageToolCallRecord } from '@hominem/db';

import type {
  ChatToolRuntime,
  RunCompletionWithToolsInput,
  RunCompletionWithToolsResult,
} from '../../application/chat-generation-types';
import { callTool, getToolDefinition, type McpToolResult } from '../../mcp/tool-registry';

export type {
  ChatGenerationLiveEvent,
  ChatToolRuntime,
  RunCompletionWithToolsInput,
  RunCompletionWithToolsResult,
} from '../../application/chat-generation-types';

const DEFAULT_MAX_ITERATIONS = 4;
const MAX_PROVIDER_RETRIES = 2;
const PROVIDER_RETRY_DELAYS_MS = [250, 750] as const;

interface AccumulatingToolCall {
  id: string;
  name: string;
  arguments: string;
}

const productionToolRuntime: ChatToolRuntime = { callTool, getToolDefinition };

function canonicalizeToolArgs(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalizeToolArgs);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalizeToolArgs(child)]),
    );
  }
  return value;
}

function getReadOnlyToolCacheKey(toolName: string, args: Record<string, unknown>) {
  return `${toolName}:${JSON.stringify(canonicalizeToolArgs(args))}`;
}

function mergeToolCallDeltas(
  accumulated: Map<number, AccumulatingToolCall>,
  deltas: ChatStreamToolCall[],
) {
  for (const delta of deltas) {
    const functionDelta = delta.function;
    const existing = accumulated.get(delta.index);
    if (!existing) {
      accumulated.set(delta.index, {
        id: delta.id ?? '',
        name: functionDelta?.name ?? '',
        arguments: functionDelta?.arguments ?? '',
      });
      continue;
    }
    if (delta.id) existing.id = delta.id;
    if (functionDelta?.name) existing.name = functionDelta.name;
    if (functionDelta?.arguments) existing.arguments += functionDelta.arguments;
  }
}

function sumUsage(
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

interface StreamOnceResult {
  assistantText: string;
  reasoningText: string;
  requestedToolCalls: AccumulatingToolCall[];
  usage: AIUsageMetrics | null;
  /** true if the provider sent back an in-band error with nothing usable in it */
  erroredEmpty: boolean;
}

async function streamOnce(opts: {
  model: string;
  messages: ChatMessages[];
  tools?: ChatFunctionTool[];
  toolChoice?: 'auto' | 'required';
  parallelToolCalls?: boolean;
  maxTokens?: number;
  reasoning?: ChatRequest['reasoning'];
  onEvent?: RunCompletionWithToolsInput['onEvent'];
}): Promise<StreamOnceResult> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await streamOnceAttempt(opts);
    } catch (error) {
      const status =
        error instanceof OpenRouterRequestError
          ? error.status
          : error && typeof error === 'object' && 'status' in error
            ? (error as { status?: unknown }).status
            : undefined;
      if (status !== 429 || attempt >= MAX_PROVIDER_RETRIES) throw error;
      await new Promise((resolve) =>
        setTimeout(resolve, PROVIDER_RETRY_DELAYS_MS[attempt] ?? PROVIDER_RETRY_DELAYS_MS.at(-1)),
      );
    }
  }
}

async function streamOnceAttempt(opts: {
  model: string;
  messages: ChatMessages[];
  tools?: ChatFunctionTool[];
  toolChoice?: 'auto' | 'required';
  parallelToolCalls?: boolean;
  maxTokens?: number;
  reasoning?: ChatRequest['reasoning'];
  onEvent?: RunCompletionWithToolsInput['onEvent'];
}): Promise<StreamOnceResult> {
  const completion = streamChatCompletion(opts);

  if (opts.onEvent) await opts.onEvent({ type: 'phase', phase: 'generating' });

  let assistantText = '';
  let reasoningText = '';
  let sawError = false;
  let usage: AIUsageMetrics | null = null;
  const accumulatedToolCalls = new Map<number, AccumulatingToolCall>();

  for await (const chunk of completion) {
    if (chunk.error) {
      throw new OpenRouterRequestError(chunk.error.message, {
        status: chunk.error.code,
        code: String(chunk.error.code),
        providerMessage: chunk.error.message,
      });
    }
    usage = sumUsage(usage, getChatCompletionUsage(chunk));
    const choice = chunk.choices?.[0];
    if (choice?.finishReason === 'error') sawError = true;
    const delta = choice?.delta;
    if (typeof delta?.content === 'string' && delta.content.length > 0) {
      assistantText += delta.content;
      if (opts.onEvent) await opts.onEvent({ type: 'text-delta', text: delta.content });
    }
    if (typeof delta?.reasoning === 'string' && delta.reasoning.length > 0) {
      reasoningText += delta.reasoning;
      if (opts.onEvent) await opts.onEvent({ type: 'reasoning-delta', text: delta.reasoning });
    }
    if (delta?.toolCalls && delta.toolCalls.length > 0) {
      mergeToolCallDeltas(accumulatedToolCalls, delta.toolCalls);
    }
  }

  const requestedToolCalls = [...accumulatedToolCalls.values()].filter((call) => call.name);
  return {
    assistantText,
    reasoningText,
    requestedToolCalls,
    usage,
    erroredEmpty: sawError && assistantText.length === 0 && requestedToolCalls.length === 0,
  };
}

// Runs the chat completion loop, running any MCP tool calls the model asks for
// in between turns, until it gives a final text answer or hits maxIterations
// (at which point we make one last call with tools off to force a real answer
// instead of just cutting the conversation off).
export async function runCompletionWithTools(
  input: RunCompletionWithToolsInput,
): Promise<RunCompletionWithToolsResult> {
  const messages = [...input.messages];
  const toolRuntime = input.toolRuntime ?? productionToolRuntime;
  const maxIterations = input.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const toolCallRecords: ChatMessageToolCallRecord[] = [];
  // Only lives for this one generation. Read-only tool results can be reused
  // within a single model turn, but writes/destructive actions always have to
  // run for real, every time the model asks.
  const readOnlyToolResults = new Map<string, Promise<McpToolResult>>();
  let usage: AIUsageMetrics | null = null;

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const useTools = input.tools.length > 0;
    let result = await streamOnce({
      model: input.model,
      messages,
      tools: useTools ? input.tools : undefined,
      toolChoice: useTools ? (input.requiresToolCall ? 'required' : 'auto') : undefined,
      parallelToolCalls: false,
      maxTokens: input.maxTokens,
      reasoning: input.reasoning,
      onEvent: input.onEvent,
    });
    usage = sumUsage(usage, result.usage);

    // Sometimes the provider comes back with an in-band error and nothing
    // else (no content, no tool calls, no thrown exception). Retry once
    // without tools so the user gets a text answer instead of a hard failure.
    if (result.erroredEmpty && useTools) {
      if (input.requiresToolCall) throw new Error('The model did not perform the required lookup');
      const retry = await streamOnce({
        model: input.model,
        messages,
        maxTokens: input.maxTokens,
        reasoning: input.reasoning,
        onEvent: input.onEvent,
      });
      usage = sumUsage(usage, retry.usage);
      result = retry;
    }

    const { assistantText, reasoningText, requestedToolCalls } = result;
    if (requestedToolCalls.length === 0) {
      return {
        assistantText,
        reasoningText: reasoningText || null,
        toolCallRecords,
        usage,
        pendingToolCall: null,
      };
    }

    // If any of these calls needs human approval, stop here instead of running
    // it (or anything else from this turn) — let the caller show a confirmation
    // prompt before anything actually runs.
    const gatedCall = requestedToolCalls.find(
      (call) => toolRuntime.getToolDefinition(call.name)?.requiresConfirmation,
    );
    if (gatedCall) {
      let parsedArgs: Record<string, unknown> = {};
      try {
        parsedArgs = gatedCall.arguments ? JSON.parse(gatedCall.arguments) : {};
      } catch {
        parsedArgs = {};
      }
      const definition = toolRuntime.getToolDefinition(gatedCall.name);
      const preview = definition?.preview
        ? await definition.preview(input.userId, parsedArgs).catch(() => null)
        : null;
      toolCallRecords.push({
        toolName: gatedCall.name,
        type: 'tool-call',
        toolCallId: gatedCall.id,
        args: parsedArgs,
        confirmationStatus: 'pending',
        executionStatus: 'pending',
        preview,
      });
      return {
        assistantText,
        reasoningText: reasoningText || null,
        toolCallRecords,
        usage,
        pendingToolCall: {
          toolCallId: gatedCall.id,
          toolName: gatedCall.name,
          args: parsedArgs,
          preview,
        },
      };
    }

    messages.push({
      role: 'assistant',
      content: assistantText || null,
      toolCalls: requestedToolCalls.map((call) => ({
        id: call.id,
        type: 'function',
        function: { name: call.name, arguments: call.arguments },
      })),
    });

    const toolResults = await Promise.all(
      requestedToolCalls.map(async (call) => {
        let parsedArgs: Record<string, unknown> = {};
        try {
          parsedArgs = call.arguments ? JSON.parse(call.arguments) : {};
        } catch {
          return {
            call,
            parsedArgs,
            content: JSON.stringify({ error: `Invalid tool arguments for ${call.name}` }),
            error: true,
            cached: false,
          };
        }

        const definition = toolRuntime.getToolDefinition(call.name);
        if (input.onEvent)
          await input.onEvent({
            type: 'tool-step',
            toolCallId: call.id,
            toolName: call.name,
            status: 'requested',
          });
        const cacheKey = definition?.readOnly
          ? getReadOnlyToolCacheKey(call.name, parsedArgs)
          : null;
        let cached = false;
        let resultPromise = cacheKey ? readOnlyToolResults.get(cacheKey) : undefined;

        if (!resultPromise) {
          if (input.onEvent)
            await input.onEvent({
              type: 'tool-step',
              toolCallId: call.id,
              toolName: call.name,
              status: 'running',
            });
          resultPromise = toolRuntime.callTool(input.userId, call.name, parsedArgs);
          if (cacheKey) {
            resultPromise = resultPromise.catch((error: unknown) => {
              readOnlyToolResults.delete(cacheKey);
              throw error;
            });
            readOnlyToolResults.set(cacheKey, resultPromise);
          }
        } else {
          cached = true;
          if (input.onEvent)
            await input.onEvent({
              type: 'tool-step',
              toolCallId: call.id,
              toolName: call.name,
              status: 'reused',
            });
        }

        try {
          const result = await resultPromise;
          if (!cached) {
            if (input.onEvent)
              await input.onEvent({
                type: 'tool-step',
                toolCallId: call.id,
                toolName: call.name,
                status: 'completed',
              });
          }
          return {
            call,
            parsedArgs,
            content: result.content[0]?.text ?? 'null',
            error: false,
            cached,
          };
        } catch (error) {
          if (input.onEvent)
            await input.onEvent({
              type: 'tool-step',
              toolCallId: call.id,
              toolName: call.name,
              status: 'failed',
            });
          const message = error instanceof Error ? error.message : 'Tool call failed';
          return {
            call,
            parsedArgs,
            content: JSON.stringify({ error: message }),
            error: true,
            cached: false,
          };
        }
      }),
    );

    for (const result of toolResults) {
      messages.push({
        role: 'tool',
        toolCallId: result.call.id,
        content: result.content,
      });
      if (!result.error && !result.cached) {
        toolCallRecords.push({
          toolName: result.call.name,
          type: 'tool-call',
          toolCallId: result.call.id,
          args: result.parsedArgs,
          executionStatus: 'completed',
        });
      }
    }
  }

  // Hit the iteration cap — force one final text-only answer instead of just
  // cutting the conversation off.
  const finalCompletion = streamChatCompletion({
    model: input.model,
    messages,
    maxTokens: input.maxTokens,
    reasoning: input.reasoning,
  });

  let assistantText = '';
  let reasoningText = '';
  for await (const chunk of finalCompletion) {
    usage = sumUsage(usage, getChatCompletionUsage(chunk));
    const delta = chunk.choices?.[0]?.delta;
    if (typeof delta?.content === 'string' && delta.content.length > 0) {
      assistantText += delta.content;
    }
    if (typeof delta?.reasoning === 'string' && delta.reasoning.length > 0) {
      reasoningText += delta.reasoning;
    }
  }

  return {
    assistantText,
    reasoningText: reasoningText || null,
    toolCallRecords,
    usage,
    pendingToolCall: null,
  };
}
