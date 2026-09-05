import { toNullableNumber, toRequiredNumber } from '@hominem/utils';
import { HTTPClient, OpenRouter } from '@openrouter/sdk';
import type { ChatUsage } from '@openrouter/sdk/models';

import { env } from './env';

export const DEFAULT_HTTP_REFERER = 'https://hominem.app';
export const DEFAULT_APP_TITLE = 'Hominem';

export const CHAT_MODEL = env.CHAT_MODEL;
export const AUDIO_TTS_MODEL = env.AUDIO_TTS_MODEL;
export const AUDIO_TTS_VOICE = env.AUDIO_TTS_VOICE;
export const EMBEDDING_MODEL = env.EMBEDDING_MODEL;
export const ENHANCE_MODEL = env.ENHANCE_MODEL;
export const JOB_EXTRACTION_MODEL = env.JOB_EXTRACTION_MODEL;
export const TASK_EXTRACTION_MODEL = env.TASK_EXTRACTION_MODEL;
export const TIME_BLOCK_EXTRACTION_MODEL = env.TIME_BLOCK_EXTRACTION_MODEL;
export const VOICE_CLEANUP_MODEL = env.VOICE_CLEANUP_MODEL;

export type OpenRouterClientOptions = {
  httpReferer?: string;
  appTitle?: string;
  appCategories?: string;
  client?: OpenRouterClientLike;
  responseHook?: (response: Response) => void;
  // Composed with the request's own absolute deadline (see
  // CHAT_REQUEST_TIMEOUT_MS in text.ts) via AbortSignal.any — passing a
  // signal makes the OpenRouter SDK skip its own internal
  // timeoutMs-derived AbortSignal.timeout(), so callers who want to cancel a
  // stalled stream (e.g. an idle-chunk timeout) need this to still keep the
  // absolute deadline.
  signal?: AbortSignal;
};

type JsonObject = Record<string, unknown>;
type OpenRouterClientLike = Pick<
  OpenRouter,
  'chat' | 'embeddings' | 'tts' | 'generations' | 'models'
>;

export type AIUsageMetrics = {
  provider: 'openrouter';
  model: string;
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
  reportedTotalTokens: number | null;
  costUsd: number | null;
  cachedPromptTokens: number | null;
  reasoningTokens: number | null;
};

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeOpenRouterChatUsage(
  model: string,
  usage?: ChatUsage | null,
): AIUsageMetrics | null {
  if (!usage) {
    return null;
  }

  const promptTokens = toRequiredNumber(usage.promptTokens);
  const outputTokens = toRequiredNumber(usage.completionTokens);
  const canonicalTotalTokens = promptTokens + outputTokens;
  const reportedTotalTokens = toNullableNumber(usage.totalTokens);

  return {
    provider: 'openrouter',
    model,
    promptTokens,
    outputTokens,
    totalTokens: canonicalTotalTokens,
    reportedTotalTokens:
      reportedTotalTokens === null || reportedTotalTokens === canonicalTotalTokens
        ? null
        : reportedTotalTokens,
    costUsd: toNullableNumber(usage.cost),
    cachedPromptTokens: toNullableNumber(usage.promptTokensDetails?.cachedTokens),
    reasoningTokens: toNullableNumber(usage.completionTokensDetails?.reasoningTokens),
  };
}

export function normalizeOpenRouterEmbeddingUsage(
  model: string,
  usage?: {
    promptTokens?: unknown;
    totalTokens?: unknown;
    cost?: unknown;
    promptTokensDetails?: Record<string, unknown> | null;
  } | null,
): AIUsageMetrics | null {
  if (!usage) {
    return null;
  }

  const promptTokens = toRequiredNumber(usage.promptTokens);
  const canonicalTotalTokens = promptTokens;
  const reportedTotalTokens = toNullableNumber(usage.totalTokens);

  return {
    provider: 'openrouter',
    model,
    promptTokens,
    outputTokens: 0,
    totalTokens: canonicalTotalTokens,
    reportedTotalTokens:
      reportedTotalTokens === null || reportedTotalTokens === canonicalTotalTokens
        ? null
        : reportedTotalTokens,
    costUsd: toNullableNumber(usage.cost),
    cachedPromptTokens:
      usage.promptTokensDetails && isJsonObject(usage.promptTokensDetails)
        ? toNullableNumber(usage.promptTokensDetails.cachedTokens)
        : null,
    reasoningTokens: null,
  };
}

export class OpenRouterRequestError extends Error {
  status?: number;
  statusText?: string;
  code?: string;
  providerMessage?: string;
  details?: JsonObject;

  constructor(
    message: string,
    options: {
      status?: number;
      statusText?: string;
      code?: string;
      providerMessage?: string;
      details?: JsonObject;
    } = {},
  ) {
    super(message);
    this.name = 'OpenRouterRequestError';
    this.status = options.status;
    this.statusText = options.statusText;
    this.code = options.code;
    this.providerMessage = options.providerMessage;
    this.details = options.details;
  }
}

function parseOpenRouterErrorDetails(body: unknown) {
  if (!body) {
    return undefined;
  }

  if (isJsonObject(body)) {
    return body;
  }

  if (typeof body !== 'string') {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(body);
    return isJsonObject(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

// The SDK maps a client-side `AbortSignal.timeout()` firing (or a failed
// connection) to one of these error names before it ever reaches us — there's
// no HTTP status code to read in that case, since no response was received.
// We surface them as a `code` so callers (e.g. retry classification) can
// treat a hung/dropped request as transient the same way they treat 429/503.
const CLIENT_ERROR_CODES: Record<string, string> = {
  RequestTimeoutError: 'timeout',
  ConnectionError: 'connection_error',
};

export function normalizeOpenRouterError(error: unknown): OpenRouterRequestError {
  if (error instanceof OpenRouterRequestError) {
    return error;
  }

  if (typeof error === 'object' && error !== null) {
    const message = Reflect.get(error, 'message');
    const statusValue = Reflect.get(error, 'status');
    const statusCodeValue = Reflect.get(error, 'statusCode');
    const details = parseOpenRouterErrorDetails(Reflect.get(error, 'body'));
    const nestedError = details?.error;
    const providerError =
      isJsonObject(nestedError) && typeof nestedError.message === 'string'
        ? nestedError
        : undefined;
    const providerMessage =
      providerError && typeof providerError.message === 'string'
        ? providerError.message
        : undefined;
    const status =
      typeof statusValue === 'number'
        ? statusValue
        : typeof statusCodeValue === 'number'
          ? statusCodeValue
          : undefined;
    const errorName = Reflect.get(error, 'name');
    const clientErrorCode =
      typeof errorName === 'string' ? CLIENT_ERROR_CODES[errorName] : undefined;

    return new OpenRouterRequestError(
      providerMessage ?? (typeof message === 'string' ? message : 'OpenRouter request failed'),
      {
        status,
        code:
          (providerError && typeof providerError.code === 'string'
            ? providerError.code
            : undefined) ?? clientErrorCode,
        providerMessage,
        details: providerError ?? details,
      },
    );
  }

  return new OpenRouterRequestError('OpenRouter request failed');
}

export function createOpenRouterClient(options: OpenRouterClientOptions = {}) {
  if (options.client) {
    return options.client;
  }

  const httpClient = options.responseHook
    ? new HTTPClient().addHook('response', options.responseHook)
    : undefined;

  return new OpenRouter({
    apiKey: env.OPENROUTER_API_KEY,
    httpReferer: options.httpReferer ?? DEFAULT_HTTP_REFERER,
    appTitle: options.appTitle ?? DEFAULT_APP_TITLE,
    appCategories: options.appCategories,
    ...(httpClient ? { httpClient } : {}),
  });
}
