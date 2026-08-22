import {
  type AIUsageMetrics,
  type ChatFunctionTool,
  type ChatMessages,
  type ChatRequest,
  type ChatStreamToolCall,
  getChatCompletionUsage,
  streamChatCompletion,
} from '@hominem/ai';
import type { ChatMessageToolCallRecord } from '@hominem/db';

import { callTool, getToolDefinition } from '../../mcp/tools';

const DEFAULT_MAX_ITERATIONS = 4;

interface AccumulatingToolCall {
  id: string;
  name: string;
  arguments: string;
}

function mergeToolCallDeltas(
  accumulated: Map<number, AccumulatingToolCall>,
  deltas: ChatStreamToolCall[],
) {
  for (const delta of deltas) {
    const existing = accumulated.get(delta.index);
    if (!existing) {
      accumulated.set(delta.index, {
        id: delta.id ?? '',
        name: delta.function?.name ?? '',
        arguments: delta.function?.arguments ?? '',
      });
      continue;
    }
    if (delta.id) existing.id = delta.id;
    if (delta.function?.name) existing.name = delta.function.name;
    if (delta.function?.arguments) existing.arguments += delta.function.arguments;
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

export interface RunCompletionWithToolsInput {
  userId: string;
  model: string;
  messages: ChatMessages[];
  tools: ChatFunctionTool[];
  maxTokens?: number;
  reasoning?: ChatRequest['reasoning'];
  maxIterations?: number;
}

export interface RunCompletionWithToolsResult {
  assistantText: string;
  reasoningText: string | null;
  toolCallRecords: ChatMessageToolCallRecord[];
  usage: AIUsageMetrics | null;
  /**
   * Set when the model requested a tool call flagged `requiresConfirmation`.
   * The loop stops immediately without executing it — the caller must commit
   * the partial reply, surface a confirmation prompt to the user, and only
   * then invoke the tool via a separate approve/reject flow.
   */
  pendingToolCall: {
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
    preview: Record<string, unknown> | null;
  } | null;
}

interface StreamOnceResult {
  assistantText: string;
  reasoningText: string;
  requestedToolCalls: AccumulatingToolCall[];
  usage: AIUsageMetrics | null;
  /** True when the provider returned an in-band error with no usable content. */
  erroredEmpty: boolean;
}

async function streamOnce(opts: {
  model: string;
  messages: ChatMessages[];
  tools?: ChatFunctionTool[];
  toolChoice?: 'auto';
  maxTokens?: number;
  reasoning?: ChatRequest['reasoning'];
}): Promise<StreamOnceResult> {
  const completion = streamChatCompletion(opts);

  let assistantText = '';
  let reasoningText = '';
  let sawError = false;
  let usage: AIUsageMetrics | null = null;
  const accumulatedToolCalls = new Map<number, AccumulatingToolCall>();

  for await (const chunk of completion) {
    usage = sumUsage(usage, getChatCompletionUsage(chunk));
    const choice = chunk.choices?.[0];
    if (choice?.finishReason === 'error') sawError = true;
    const delta = choice?.delta;
    if (typeof delta?.content === 'string' && delta.content.length > 0) {
      assistantText += delta.content;
    }
    if (typeof delta?.reasoning === 'string' && delta.reasoning.length > 0) {
      reasoningText += delta.reasoning;
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

/**
 * Runs a (possibly multi-turn) chat completion, executing any MCP tool calls
 * the model requests in between turns, until it produces a final text answer
 * or `maxIterations` is reached (at which point one last call is made with
 * tools disabled to force a text response instead of truncating silently).
 */
export async function runCompletionWithTools(
  input: RunCompletionWithToolsInput,
): Promise<RunCompletionWithToolsResult> {
  const messages = [...input.messages];
  const maxIterations = input.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const toolCallRecords: ChatMessageToolCallRecord[] = [];
  let usage: AIUsageMetrics | null = null;

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const useTools = input.tools.length > 0;
    let result = await streamOnce({
      model: input.model,
      messages,
      tools: useTools ? input.tools : undefined,
      toolChoice: useTools ? 'auto' : undefined,
      maxTokens: input.maxTokens,
      reasoning: input.reasoning,
    });
    usage = sumUsage(usage, result.usage);

    // Tool-calling requests occasionally come back from the provider as an
    // in-band error with no content and no tool calls (no exception thrown).
    // Retry once without tools so the user still gets a text answer instead
    // of a hard failure.
    if (result.erroredEmpty && useTools) {
      const retry = await streamOnce({
        model: input.model,
        messages,
        maxTokens: input.maxTokens,
        reasoning: input.reasoning,
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

    // If any requested call needs human approval, stop here rather than
    // executing it (or any other call from this same turn) — surface it to
    // the caller so a confirmation prompt can be shown before anything runs.
    const gatedCall = requestedToolCalls.find(
      (call) => getToolDefinition(call.name)?.requiresConfirmation,
    );
    if (gatedCall) {
      let parsedArgs: Record<string, unknown> = {};
      try {
        parsedArgs = gatedCall.arguments ? JSON.parse(gatedCall.arguments) : {};
      } catch {
        parsedArgs = {};
      }
      const definition = getToolDefinition(gatedCall.name);
      const preview = definition?.preview
        ? await definition.preview(input.userId, parsedArgs).catch(() => null)
        : null;
      toolCallRecords.push({
        toolName: gatedCall.name,
        type: 'tool-call',
        toolCallId: gatedCall.id,
        args: parsedArgs,
        status: 'pending',
        preview,
      });
      return {
        assistantText,
        reasoningText: reasoningText || null,
        toolCallRecords,
        usage,
        pendingToolCall: { toolCallId: gatedCall.id, toolName: gatedCall.name, args: parsedArgs, preview },
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

    await Promise.all(
      requestedToolCalls.map(async (call) => {
        let parsedArgs: Record<string, unknown> = {};
        try {
          parsedArgs = call.arguments ? JSON.parse(call.arguments) : {};
        } catch {
          messages.push({
            role: 'tool',
            toolCallId: call.id,
            content: JSON.stringify({ error: `Invalid tool arguments for ${call.name}` }),
          });
          return;
        }

        try {
          const result = await callTool(input.userId, call.name, parsedArgs);
          messages.push({
            role: 'tool',
            toolCallId: call.id,
            content: result.content[0]?.text ?? 'null',
          });
          toolCallRecords.push({
            toolName: call.name,
            type: 'tool-call',
            toolCallId: call.id,
            args: parsedArgs,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Tool call failed';
          messages.push({
            role: 'tool',
            toolCallId: call.id,
            content: JSON.stringify({ error: message }),
          });
        }
      }),
    );
  }

  // Iteration cap reached — force a final text-only answer instead of
  // silently truncating the conversation.
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
