import {
  type AIUsageMetrics,
  type ChatFunctionTool,
  type ChatMessages,
  type ChatRequest,
  getChatCompletionUsage,
  streamChatCompletion,
} from '@hominem/ai';
import {
  type ChatModel,
  type GenerationInput,
  type GenerationState,
  type ProviderChunk,
  type ProviderToolCallDelta,
} from '@hominem/chat';

export type OpenRouterChatModelOptions = {
  model: string;
  messages: ChatMessages[];
  tools: ChatFunctionTool[];
  maxTokens?: number;
  reasoning?: ChatRequest['reasoning'];
  requiresToolCall?: boolean;
  requiresConfirmation?: (toolName: string) => boolean;
  maxAttempts?: number;
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
        function?: { name?: string | null; arguments?: string | null } | null;
      }[];
    };
  }[];
}): ProviderChunk {
  const delta = chunk.choices?.[0]?.delta;
  return {
    content: delta?.content,
    reasoning: delta?.reasoning,
    toolCalls: delta?.toolCalls as readonly ProviderToolCallDelta[] | undefined,
  };
}

function reconstructedCalls(calls: Map<number, ProviderToolCallDelta>) {
  return [...calls.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, call]) => ({
      id: call.id ?? '',
      type: 'function' as const,
      function: {
        name: call.function?.name ?? '',
        arguments: call.function?.arguments ?? '',
      },
    }));
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
        for (const call of providerChunk.toolCalls ?? []) calls.set(call.index, call);
        yield { type: 'provider-chunk', chunk: providerChunk };
      }

      const toolCalls = reconstructedCalls(calls);
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
      yield {
        type: 'provider-turn-failed',
        message: error instanceof Error ? error.message : 'Provider request failed',
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
