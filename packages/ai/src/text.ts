import type { ChatRequest, ChatResult, ChatStreamChunk } from '@openrouter/sdk/models';
import type { AnyTextAdapter, ContentPart, ModelMessage, StreamChunk } from '@tanstack/ai';
import { chat, convertSchemaToJsonSchema } from '@tanstack/ai';
import {
  createOpenRouterText,
  openRouterText,
  type OpenRouterTextModelOptions,
} from '@tanstack/ai-openrouter';
import {
  convertWebFetchToolToAdapterFormat,
  webFetchTool,
  webSearchTool,
} from '@tanstack/ai-openrouter/tools';
import { z } from 'zod';

import { env } from './env';
import {
  createOpenRouterClient,
  DEFAULT_APP_TITLE,
  ENHANCE_MODEL,
  DEFAULT_HTTP_REFERER,
  CHAT_MODEL,
  normalizeOpenRouterChatUsage,
  normalizeOpenRouterError,
  type AIUsageMetrics,
  type OpenRouterClientOptions,
} from './shared';

// Simple message type for callers that build raw message arrays (e.g. voice)
export type ChatMessage = {
  role: string;
  content: string | Record<string, unknown>[];
};

// Minimal body type for postChatCompletion, which must return a raw Response for audio streaming
type RawChatBody = {
  model?: string;
  messages: ChatMessage[];
  modalities?: string[];
  audio?: Record<string, unknown>;
  stream?: boolean;
};

const OPENROUTER_STREAM_DONE = 'data: [DONE]\n\n';

export type OpenRouterTextAdapterOptions = OpenRouterClientOptions & {
  model?: Parameters<typeof createOpenRouterText>[0];
  adapter?: AnyTextAdapter;
};

export type StructuredChatCompletionResult<T> = {
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

export function createOpenRouterTextAdapter(options: OpenRouterTextAdapterOptions = {}) {
  if (options.adapter) {
    return options.adapter;
  }

  const model = (options.model ?? CHAT_MODEL) as Parameters<typeof createOpenRouterText>[0];

  return createOpenRouterText(model, env.OPENROUTER_API_KEY ?? '', {
    httpReferer: options.httpReferer ?? DEFAULT_HTTP_REFERER,
    appTitle: options.appTitle ?? DEFAULT_APP_TITLE,
    appCategories: options.appCategories,
  });
}

export function getSharedTextModel() {
  return createOpenRouterTextAdapter();
}

function getSharedTextAdapterForModel(model?: string, options: OpenRouterClientOptions = {}) {
  return createOpenRouterTextAdapter({
    ...options,
    ...(model ? { model: model as Parameters<typeof createOpenRouterText>[0] } : {}),
  });
}

function parseDataUrl(value: string) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(value);
  if (!match) {
    return null;
  }

  return { mimeType: match[1], data: match[2] };
}

function isModality(value: string) {
  return value === 'text' || value === 'image' || value === 'audio';
}

function normalizeModalities(modalities?: string[]) {
  if (!modalities) {
    return undefined;
  }

  if (!modalities.every(isModality)) {
    throw new Error('Legacy OpenRouter request included an unsupported modality');
  }

  return modalities;
}

function toContentPart(item: Record<string, unknown>): ContentPart {
  if (item.type === 'text' && typeof item.text === 'string') {
    return { type: 'text', content: item.text };
  }

  if (item.type === 'image_url' && item.imageUrl && typeof item.imageUrl === 'object') {
    const imageUrl = item.imageUrl as { url?: unknown; detail?: unknown };
    if (typeof imageUrl.url !== 'string') {
      throw new Error('Legacy OpenRouter image content is missing a URL');
    }

    const dataUrl = parseDataUrl(imageUrl.url);
    return {
      type: 'image',
      source: dataUrl
        ? { type: 'data', value: dataUrl.data, mimeType: dataUrl.mimeType }
        : { type: 'url', value: imageUrl.url },
      ...(typeof imageUrl.detail === 'string' ? { metadata: { detail: imageUrl.detail } } : {}),
    };
  }

  if (item.type === 'input_audio' && item.inputAudio && typeof item.inputAudio === 'object') {
    const inputAudio = item.inputAudio as { data?: unknown; format?: unknown };
    if (typeof inputAudio.data !== 'string') {
      throw new Error('Legacy OpenRouter audio content is missing base64 data');
    }

    const format = typeof inputAudio.format === 'string' ? inputAudio.format : 'mp3';
    return {
      type: 'audio',
      source: { type: 'data', value: inputAudio.data, mimeType: `audio/${format}` },
    };
  }

  if (item.type === 'video_url' && item.videoUrl && typeof item.videoUrl === 'object') {
    const videoUrl = item.videoUrl as { url?: unknown };
    if (typeof videoUrl.url !== 'string') {
      throw new Error('Legacy OpenRouter video content is missing a URL');
    }

    return {
      type: 'video',
      source: { type: 'url', value: videoUrl.url },
    };
  }

  throw new Error('Unsupported legacy OpenRouter content part');
}

function normalizeLegacyMessageContent(
  content: ChatMessage['content'],
): string | null | Array<ContentPart> {
  if (typeof content === 'string') {
    return content;
  }

  if (!Array.isArray(content)) {
    throw new Error('Legacy OpenRouter message content must be a string or content array');
  }

  if (content.length === 0) {
    return null;
  }

  return content.map((item) => {
    if (typeof item !== 'object' || item === null) {
      throw new Error('Legacy OpenRouter content array must contain objects');
    }

    return toContentPart(item);
  });
}

function normalizeLegacyMessages(messages: ChatMessage[]) {
  const systemPrompts: string[] = [];
  const modelMessages: ModelMessage[] = [];

  for (const message of messages) {
    if (message.role === 'system') {
      if (typeof message.content !== 'string') {
        throw new Error('System messages must use string content');
      }

      systemPrompts.push(message.content);
      continue;
    }

    if (message.role !== 'user' && message.role !== 'assistant' && message.role !== 'tool') {
      throw new Error(`Unsupported legacy OpenRouter role: ${message.role}`);
    }

    modelMessages.push({
      role: message.role,
      content: normalizeLegacyMessageContent(message.content),
    });
  }

  return { systemPrompts, modelMessages };
}

function createRawChatCompletionResponse(content: string, model: string): ChatResult {
  return {
    id: 'tanstack-ai-response',
    object: 'chat.completion',
    created: Date.now(),
    model,
    choices: [{ index: 0, finishReason: 'stop', message: { role: 'assistant', content } }],
  } as unknown as ChatResult;
}

function createLegacyChatCompletionStream(stream: AsyncIterable<StreamChunk>) {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.type === 'TEXT_MESSAGE_CONTENT' && chunk.delta) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  choices: [{ delta: { content: chunk.delta } }],
                })}\n\n`,
              ),
            );
          }

          if (chunk.type === 'RUN_ERROR') {
            throw new Error(chunk.message);
          }
        }

        controller.enqueue(encoder.encode(OPENROUTER_STREAM_DONE));
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

// Returns a raw Response — used by voice for binary audio streaming
export async function postChatCompletion(
  body: RawChatBody,
  options: OpenRouterTextAdapterOptions = {},
): Promise<Response> {
  const model = body.model ?? CHAT_MODEL;
  const { systemPrompts, modelMessages } = normalizeLegacyMessages(body.messages);
  const adapter = getSharedTextAdapterForModel(model, options);
  const modelOptions: Record<string, unknown> = {
    ...(body.modalities ? { modalities: normalizeModalities(body.modalities) } : {}),
    ...(body.audio ? { audio: body.audio } : {}),
  };

  if (body.stream) {
    try {
      const stream = chat({
        adapter,
        messages: modelMessages,
        systemPrompts,
        stream: true,
        ...(Object.keys(modelOptions).length > 0
          ? { modelOptions: modelOptions as OpenRouterTextModelOptions }
          : {}),
      });

      return new Response(createLegacyChatCompletionStream(stream), {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      });
    } catch (error) {
      throw normalizeOpenRouterError(error);
    }
  }

  try {
    const content = await chat({
      adapter,
      messages: modelMessages,
      systemPrompts,
      stream: false,
      ...(Object.keys(modelOptions).length > 0
        ? { modelOptions: modelOptions as OpenRouterTextModelOptions }
        : {}),
    });

    return Response.json(createRawChatCompletionResponse(content, model));
  } catch (error) {
    throw normalizeOpenRouterError(error);
  }
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

export { chat, convertWebFetchToolToAdapterFormat, openRouterText, webFetchTool, webSearchTool };
