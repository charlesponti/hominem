import type { ChatRequest, ChatResult, ChatStreamChunk } from '@openrouter/sdk/models';
import { z } from 'zod';

import { convertSchemaToJsonSchema } from './json-schema';
import {
  createOpenRouterClient,
  DEFAULT_APP_TITLE,
  DEFAULT_HTTP_REFERER,
  ENHANCE_MODEL,
  normalizeOpenRouterChatUsage,
  normalizeOpenRouterError,
  type AIUsageMetrics,
  type OpenRouterClientOptions,
} from './shared';

type StructuredChatCompletionResult<T> = {
  output: T;
  usage: AIUsageMetrics | null;
};

// Bounds how long a chat completion request can hang with no response before
// the SDK aborts it. Without this, a stalled OpenRouter connection (no error,
// no bytes) blocks the request forever — the generation state machine's retry
// logic never runs because nothing ever rejects. Generous because a long,
// reasoning-heavy response can legitimately take a while to fully stream.
// Composed with a caller-supplied signal (see chat-generation-provider.ts's
// per-chunk idle timeout, which fires much sooner than this on a genuinely
// stalled stream) via AbortSignal.any, since passing any signal makes the
// SDK skip its own timeoutMs handling entirely.
const CHAT_REQUEST_TIMEOUT_MS = 120_000;

function withRequestTimeout(signal?: AbortSignal): { signal: AbortSignal } {
  const deadline = AbortSignal.timeout(CHAT_REQUEST_TIMEOUT_MS);
  return { signal: signal ? AbortSignal.any([signal, deadline]) : deadline };
}

function isAIUsageMetrics(value: unknown): value is AIUsageMetrics {
  if (!value || typeof value !== 'object') return false;
  return (
    Reflect.get(value, 'provider') === 'openrouter' &&
    typeof Reflect.get(value, 'model') === 'string' &&
    typeof Reflect.get(value, 'promptTokens') === 'number' &&
    typeof Reflect.get(value, 'completionTokens') === 'number' &&
    typeof Reflect.get(value, 'totalTokens') === 'number'
  );
}

export class StructuredOutputError extends Error {
  usage: AIUsageMetrics | null;
  cause?: unknown;

  constructor(message: string, options: { usage: AIUsageMetrics | null; cause?: unknown }) {
    super(message);
    this.name = 'StructuredOutputError';
    this.usage = options.usage;
    this.cause = options.cause;
  }
}

function describeStructuredOutputError(error: unknown) {
  if (error instanceof z.ZodError) {
    const issues = error.issues
      .slice(0, 5)
      .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
      .join('; ');

    return issues
      ? `OpenRouter returned invalid structured output: ${issues}`
      : 'OpenRouter returned invalid structured output';
  }

  return 'OpenRouter returned invalid structured output';
}

export async function createChatCompletion(
  request: Omit<ChatRequest, 'stream'>,
  options: OpenRouterClientOptions = {},
): Promise<ChatResult> {
  try {
    const client = createOpenRouterClient(options);
    return await client.chat.send(
      {
        httpReferer: options.httpReferer ?? DEFAULT_HTTP_REFERER,
        appTitle: options.appTitle ?? DEFAULT_APP_TITLE,
        appCategories: options.appCategories,
        chatRequest: { ...request, stream: false },
      },
      withRequestTimeout(options.signal),
    );
  } catch (error) {
    throw normalizeOpenRouterError(error);
  }
}

export async function* streamChatCompletion(
  request: Omit<ChatRequest, 'stream'>,
  options: OpenRouterClientOptions = {},
): AsyncGenerator<ChatStreamChunk> {
  try {
    const client = createOpenRouterClient(options);
    const stream = await client.chat.send(
      {
        httpReferer: options.httpReferer ?? DEFAULT_HTTP_REFERER,
        appTitle: options.appTitle ?? DEFAULT_APP_TITLE,
        appCategories: options.appCategories,
        chatRequest: { ...request, stream: true },
      },
      withRequestTimeout(options.signal),
    );

    yield* stream;
  } catch (error) {
    throw normalizeOpenRouterError(error);
  }
}

export function getChatCompletionUsage(response: Pick<ChatResult, 'model' | 'usage'>) {
  return normalizeOpenRouterChatUsage(response.model, response.usage);
}

function parseStructuredOutputText(response: ChatResult) {
  const content = getChatCompletionText(response).trim();
  if (!content) {
    throw new Error('No structured output returned from OpenRouter');
  }

  try {
    const parsed: unknown = JSON.parse(content);
    return parsed;
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `OpenRouter returned invalid structured JSON: ${error.message}`
        : 'OpenRouter returned invalid structured JSON',
    );
  }
}

export function getStructuredOutputUsage(value: unknown) {
  if (value && typeof value === 'object' && 'usage' in value) {
    const usage = Reflect.get(value, 'usage');
    if (usage === null) return null;
    if (isAIUsageMetrics(usage)) {
      return usage;
    }
  }

  if (value instanceof StructuredOutputError) {
    return value.usage;
  }

  return null;
}

export async function createStructuredChatCompletion<TSchema extends z.ZodTypeAny>(
  input: {
    model: string;
    messages: ChatRequest['messages'];
    schema: TSchema;
    schemaName: string;
    schemaDescription?: string;
    temperature?: number;
    maxCompletionTokens?: number;
  },
  options: OpenRouterClientOptions = {},
): Promise<StructuredChatCompletionResult<z.infer<TSchema>>> {
  const response = await createChatCompletion(
    {
      model: input.model,
      messages: input.messages,
      responseFormat: {
        type: 'json_schema',
        jsonSchema: {
          name: input.schemaName,
          ...(input.schemaDescription ? { description: input.schemaDescription } : {}),
          schema: convertSchemaToJsonSchema(input.schema, { forStructuredOutput: true }),
          strict: true,
        },
      },
      reasoning: { effort: 'none' },
      ...(input.temperature !== undefined ? { temperature: input.temperature } : {}),
      ...(input.maxCompletionTokens !== undefined
        ? { maxCompletionTokens: input.maxCompletionTokens }
        : {}),
    },
    options,
  );

  const usage = getChatCompletionUsage(response);
  let parsed: unknown;

  try {
    parsed = parseStructuredOutputText(response);
  } catch (error) {
    throw new StructuredOutputError(
      error instanceof Error ? error.message : 'OpenRouter returned invalid structured JSON',
      { usage, cause: error },
    );
  }

  try {
    return {
      output: input.schema.parse(parsed),
      usage,
    };
  } catch (error) {
    throw new StructuredOutputError(describeStructuredOutputError(error), {
      usage,
      cause: error,
    });
  }
}

export function getChatCompletionText(response: ChatResult, fallback = ''): string {
  const content = response.choices?.[0]?.message?.content;
  return typeof content === 'string' ? content : fallback;
}

export async function enhanceText(
  input: { text: string; instruction?: string },
  systemPrompt: string,
) {
  const response = await createChatCompletion({
    model: ENHANCE_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: input.instruction
          ? `Instruction: ${input.instruction}\n\nText:\n${input.text}`
          : input.text,
      },
    ],
    temperature: 0.2,
    maxCompletionTokens: 2000,
  });

  return {
    text: getChatCompletionText(response, input.text).trim() || input.text,
    usage: getChatCompletionUsage(response),
  };
}

export async function generateNoteFromChat(
  input: { transcript: string; instruction?: string },
  systemPrompt: string,
) {
  const response = await createChatCompletion({
    model: ENHANCE_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: input.instruction
          ? `Instruction: ${input.instruction}\n\nConversation transcript:\n${input.transcript}`
          : `Conversation transcript:\n${input.transcript}`,
      },
    ],
    temperature: 0.4,
    maxCompletionTokens: 4000,
  });

  const text = getChatCompletionText(response).trim();
  if (!text) {
    throw new Error('Model returned an empty note');
  }

  return {
    text,
    usage: getChatCompletionUsage(response),
  };
}
