import {
  type ChatFunctionTool,
  type ChatMessages,
  type ChatRequest,
  streamChatCompletion,
} from '@hominem/ai';
import {
  type GenerationInput,
  type GenerationState,
  type ProviderChunk,
  type ProviderToolCallDelta,
} from '@hominem/chat';

export type OpenRouterGenerationProviderOptions = {
  model: string;
  messages: ChatMessages[];
  tools: ChatFunctionTool[];
  maxTokens?: number;
  reasoning?: ChatRequest['reasoning'];
  requiresToolCall?: boolean;
  requiresConfirmation?: (toolName: string) => boolean;
  maxAttempts?: number;
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

export function createOpenRouterGenerationProvider(options: OpenRouterGenerationProviderOptions) {
  const messages = [...options.messages];
  let attempt = 0;
  let firstTurn = true;

  async function* open(state: GenerationState): AsyncIterable<GenerationInput> {
    const calls = new Map<number, ProviderToolCallDelta>();
    const generationIteration = state.iteration;
    try {
      const completion = streamChatCompletion({
        model: options.model,
        messages,
        tools: options.tools.length > 0 ? options.tools : undefined,
        toolChoice:
          options.tools.length > 0
            ? firstTurn && options.requiresToolCall
              ? 'required'
              : 'auto'
            : undefined,
        parallelToolCalls: false,
        maxTokens: options.maxTokens,
        reasoning: options.reasoning,
      });

      for await (const chunk of completion) {
        if (chunk.error) throw new Error(chunk.error.message);
        const providerChunk = toProviderChunk(chunk);
        for (const call of providerChunk.toolCalls ?? []) calls.set(call.index, call);
        yield { type: 'provider-chunk', chunk: providerChunk };
      }

      const toolCalls = reconstructedCalls(calls);
      if (toolCalls.length > 0) {
        messages.push({ role: 'assistant', content: null, toolCalls });
      }
      const confirmationCallIds = toolCalls
        .filter((call) => options.requiresConfirmation?.(call.function.name) ?? false)
        .map((call) => call.id);
      const requiredToolCall = firstTurn && Boolean(options.requiresToolCall);
      firstTurn = false;
      attempt = 0;
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
        attempt: Math.max(attempt, generationIteration),
        maxAttempts: options.maxAttempts ?? 2,
      };
    }
  }

  return {
    open: ({ state }: { turnId: string; iteration: number; state: GenerationState }) => open(state),
    appendToolResult: (callId: string, content: string) => {
      messages.push({ role: 'tool', toolCallId: callId, content });
    },
    retry: ({ state }: { attempt: number; state: GenerationState }) => {
      attempt = state.iteration;
      return open(state);
    },
  };
}
