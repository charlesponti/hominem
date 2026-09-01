import {
  type AIUsageMetrics,
  type ChatFunctionTool,
  type ChatMessages,
  type ChatRequest,
  getChatCompletionUsage,
  streamChatCompletion,
} from '@hominem/ai';
import {
  providerChunkSchema,
  reconstructProviderToolCalls,
  type ChatModel,
  type GenerationInput,
  type GenerationState,
  type ProviderChunk,
  type ProviderToolCallDelta,
} from '@hominem/chat';
import { logger } from '@hominem/telemetry';

export class ProviderInputError extends Error {
  constructor(
    readonly diagnostics: {
      issuePaths: readonly string[];
      shape: ProviderChunkShape;
    },
  ) {
    super('Provider returned an invalid generation chunk');
    this.name = 'ProviderInputError';
  }
}

type ProviderChunkShape = {
  choiceCount: number;
  hasDelta: boolean;
  contentType: string;
  reasoningType: string;
  toolCallsType: string;
  toolCallIndexes: readonly number[];
  toolCallFunctionKeys: readonly string[][];
};

export type OpenRouterChatModelOptions = {
  model: string;
  messages: ChatMessages[];
  tools: ChatFunctionTool[];
  maxTokens?: number;
  reasoning?: ChatRequest['reasoning'];
  requiresToolCall?: boolean;
  requiresConfirmation?: (toolName: string) => boolean;
  maxAttempts?: number;
  // Usage is provider metadata and may be absent even when the response is valid.
  onUsage?: (usage: AIUsageMetrics | null) => void;
};

function toProviderChunk(chunk: {
  choices?: readonly {
    delta?: {
      content?: string | null;
      reasoning?: string | null;
      toolCalls?: readonly {
        index: number;
        id?: string | null;
        type?: 'function';
        function?: { name?: string | null; arguments?: string | null } | null;
      }[];
    };
  }[];
}): ProviderChunk {
  const delta = chunk.choices?.[0]?.delta;
  const shape: ProviderChunkShape = {
    choiceCount: chunk.choices?.length ?? 0,
    hasDelta: Boolean(delta),
    contentType: typeof delta?.content,
    reasoningType: typeof delta?.reasoning,
    toolCallsType: Array.isArray(delta?.toolCalls) ? 'array' : typeof delta?.toolCalls,
    toolCallIndexes: (delta?.toolCalls ?? []).map((call) => call.index),
    toolCallFunctionKeys: (delta?.toolCalls ?? []).map((call) =>
      call.function ? Object.keys(call.function).sort() : [],
    ),
  };
  const result = providerChunkSchema.safeParse({
    content: delta?.content,
    reasoning: delta?.reasoning,
    toolCalls: delta?.toolCalls,
  });
  if (!result.success) {
    throw new ProviderInputError({
      issuePaths: result.error.issues.map((issue) => issue.path.join('.') || '<root>'),
      shape,
    });
  }
  return {
    content: result.data.content,
    reasoning: result.data.reasoning,
    toolCalls: result.data.toolCalls?.map(({ type: _type, ...call }) => call),
  };
}

function isTransient(error: unknown): boolean {
  return (
    error instanceof Error &&
    ('status' in error ? error.status === 429 || error.status === 503 : false)
  );
}

export class OpenRouterChatModel implements ChatModel {
  private readonly messages: ChatMessages[];
  private attempt = 0;
  private firstTurn = true;

  constructor(private readonly options: OpenRouterChatModelOptions) {
    this.messages = [...options.messages];
  }

  private async *streamTurn(state: GenerationState): AsyncIterable<GenerationInput> {
    const calls = new Map<number, ProviderToolCallDelta>();
    const generationIteration = state.iteration;
    try {
      const completion = streamChatCompletion({
        model: this.options.model,
        messages: this.messages,
        tools: this.options.tools.length > 0 ? this.options.tools : undefined,
        toolChoice:
          this.options.tools.length > 0
            ? this.firstTurn && this.options.requiresToolCall
              ? 'required'
              : 'auto'
            : undefined,
        parallelToolCalls: false,
        maxTokens: this.options.maxTokens,
        reasoning: this.options.reasoning,
      });

      for await (const chunk of completion) {
        if (chunk.error) throw new Error(chunk.error.message);
        this.options.onUsage?.(getChatCompletionUsage(chunk));
        const providerChunk = toProviderChunk(chunk);
        for (const call of providerChunk.toolCalls ?? []) {
          const previous = calls.get(call.index);
          calls.set(call.index, {
            index: call.index,
            id: call.id ?? previous?.id,
            function: {
              name: call.function?.name ?? previous?.function?.name,
              arguments: `${previous?.function?.arguments ?? ''}${call.function?.arguments ?? ''}`,
            },
          });
        }
        yield { type: 'provider-chunk', chunk: providerChunk };
      }

      const toolCalls = reconstructProviderToolCalls(calls);
      if (toolCalls.length > 0) {
        this.messages.push({ role: 'assistant', content: null, toolCalls });
      }
      const confirmationCallIds = toolCalls.reduce<string[]>((ids, call) => {
        if (this.options.requiresConfirmation?.(call.function.name) ?? false) ids.push(call.id);
        return ids;
      }, []);
      const requiredToolCall = this.firstTurn && Boolean(this.options.requiresToolCall);
      this.firstTurn = false;
      this.attempt = 0;
      yield {
        type: 'provider-turn-completed',
        requiredToolCall,
        confirmationCallIds,
      };
    } catch (error) {
      if (error instanceof ProviderInputError) {
        logger.warn('provider_chunk_rejected', {
          model: this.options.model,
          iteration: generationIteration,
          ...error.diagnostics,
        });
      }
      yield {
        type: 'provider-turn-failed',
        message:
          error instanceof ProviderInputError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Provider request failed',
        transient: isTransient(error),
        attempt: Math.max(this.attempt, generationIteration),
        maxAttempts: this.options.maxAttempts ?? 2,
      };
    }
  }

  open({ state }: { turnId: string; iteration: number; state: GenerationState }) {
    return this.streamTurn(state);
  }

  appendToolResult({ call, result }: { call: { id: string }; result: { content: string } }) {
    this.messages.push({ role: 'tool', toolCallId: call.id, content: result.content });
  }

  retry({ attempt, state }: { attempt: number; state: GenerationState }) {
    this.attempt = attempt;
    return this.streamTurn(state);
  }
}
