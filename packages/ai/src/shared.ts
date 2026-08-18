import { toNullableNumber, toRequiredNumber } from '@hominem/utils';
import { OpenRouter } from '@openrouter/sdk';

import { env } from './env';

export const DEFAULT_HTTP_REFERER = 'https://hominem.app';
export const DEFAULT_APP_TITLE = 'Hominem';

export const CHAT_MODEL = env.CHAT_MODEL;
export const AUDIO_STT_MODEL = env.AUDIO_STT_MODEL;
export const AUDIO_TTS_MODEL = env.AUDIO_TTS_MODEL;
export const EMBEDDING_MODEL = env.EMBEDDING_MODEL;
export const ENHANCE_MODEL = env.ENHANCE_MODEL;
export const JOB_EXTRACTION_MODEL = env.JOB_EXTRACTION_MODEL;
export const IMAGE_MODEL = env.IMAGE_MODEL;
export const TASK_EXTRACTION_MODEL = env.TASK_EXTRACTION_MODEL;
export const TIME_BLOCK_EXTRACTION_MODEL = env.TIME_BLOCK_EXTRACTION_MODEL;
export const VOICE_CLEANUP_MODEL = env.VOICE_CLEANUP_MODEL;

export type OpenRouterClientOptions = {
  httpReferer?: string;
  appTitle?: string;
  appCategories?: string;
  client?: OpenRouterClientLike;
};

export type EmbeddingOptions = OpenRouterClientOptions & {
  model?: string;
  inputType?: string;
  dimensions?: number;
};

export type TranscriptionOptions = OpenRouterClientOptions & {
  model?: string;
  language?: string;
};

export type ImageGenerationOptions = OpenRouterClientOptions & {
  model?: string;
  imageModel?: string;
  aspectRatio?: string;
  background?: string;
  moderation?: string;
  outputCompression?: number;
  outputFormat?: string;
  partialImages?: number;
  quality?: string;
  size?: string;
};

export type JsonObject = Record<string, unknown>;
export type OpenRouterClientLike = Pick<OpenRouter, 'chat' | 'embeddings' | 'tts'>;

export type AIUsageMetrics = {
  provider: 'openrouter';
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  reportedTotalTokens: number | null;
  costUsd: number | null;
  cachedPromptTokens: number | null;
  reasoningTokens: number | null;
};

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeOpenRouterChatUsage(
  model: string,
  usage?: {
    promptTokens?: unknown;
    completionTokens?: unknown;
    totalTokens?: unknown;
    cost?: unknown;
    promptTokensDetails?: { cachedTokens?: unknown } | null;
    completionTokensDetails?: { reasoningTokens?: unknown } | null;
  } | null,
): AIUsageMetrics | null {
  if (!usage) {
    return null;
  }

  const promptTokens = toRequiredNumber(usage.promptTokens);
  const completionTokens = toRequiredNumber(usage.completionTokens);
  const canonicalTotalTokens = promptTokens + completionTokens;
  const reportedTotalTokens = toNullableNumber(usage.totalTokens);

  return {
    provider: 'openrouter',
    model,
    promptTokens,
    completionTokens,
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
    completionTokens: 0,
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
    const parsed = JSON.parse(body) as unknown;
    return isJsonObject(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function normalizeOpenRouterError(error: unknown): OpenRouterRequestError {
  if (error instanceof OpenRouterRequestError) {
    return error;
  }

  if (typeof error === 'object' && error !== null) {
    const candidate = error as {
      message?: unknown;
      status?: unknown;
      statusCode?: unknown;
      body?: unknown;
    };
    const details = parseOpenRouterErrorDetails(candidate.body);
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
      typeof candidate.status === 'number'
        ? candidate.status
        : typeof candidate.statusCode === 'number'
          ? candidate.statusCode
          : undefined;

    return new OpenRouterRequestError(
      providerMessage ??
        (typeof candidate.message === 'string' ? candidate.message : 'OpenRouter request failed'),
      {
        status,
        code:
          providerError && typeof providerError.code === 'string' ? providerError.code : undefined,
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

  return new OpenRouter({
    apiKey: env.OPENROUTER_API_KEY,
    httpReferer: options.httpReferer ?? DEFAULT_HTTP_REFERER,
    appTitle: options.appTitle ?? DEFAULT_APP_TITLE,
    appCategories: options.appCategories,
  });
}
