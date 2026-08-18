import type { ChatRequest, ChatResult, ChatStreamChunk } from '@openrouter/sdk/models';
import { convertSchemaToJsonSchema } from '@tanstack/ai';
import { z } from 'zod';

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
    return await client.chat.send({
      httpReferer: options.httpReferer ?? DEFAULT_HTTP_REFERER,
      appTitle: options.appTitle ?? DEFAULT_APP_TITLE,
      appCategories: options.appCategories,
      chatRequest: { ...request, stream: false },
    });
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
    const stream = await client.chat.send({
      httpReferer: options.httpReferer ?? DEFAULT_HTTP_REFERER,
      appTitle: options.appTitle ?? DEFAULT_APP_TITLE,
      appCategories: options.appCategories,
      chatRequest: { ...request, stream: true },
    });

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
    return JSON.parse(content) as unknown;
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `OpenRouter returned invalid structured JSON: ${error.message}`
        : 'OpenRouter returned invalid structured JSON',
    );
  }
}

export function getStructuredOutputUsage(value: unknown) {
  if (
    value &&
    typeof value === 'object' &&
    'usage' in value &&
    ((value as { usage?: unknown }).usage === null ||
      (typeof (value as { usage?: unknown }).usage === 'object' &&
        (value as { usage?: unknown }).usage !== undefined))
  ) {
    return (value as { usage: AIUsageMetrics | null }).usage;
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
          schema: convertSchemaToJsonSchema(input.schema, {
            forStructuredOutput: true,
          }) as Record<string, unknown>,
          strict: true,
        },
      },
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
