import { createOpenAI } from '@ai-sdk/openai';
import { logger } from '@hominem/utils/logger';
import type { LanguageModelV1 } from 'ai';
import OpenAI from 'openai';

import { env } from './env';

/**
 * Default model when AI_MODEL is not set.
 * OpenRouter model IDs: provider/model-name (e.g. openai/gpt-4o, anthropic/claude-3-5-sonnet)
 * Full list: https://openrouter.ai/models
 */
const DEFAULT_AI_MODEL = 'openai/gpt-4o-mini';

/** OpenRouter exposes an OpenAI-compatible API at this base URL. */
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

type SharedAiProvider = 'openai' | 'openrouter';

interface SharedTextModelOptions {
  structuredOutputs?: boolean;
}

let hasLoggedSharedAiConfiguration = false;

function getSharedAiProvider(): SharedAiProvider {
  return env.AI_PROVIDER === 'openai' ? 'openai' : 'openrouter';
}

function getSharedAiModelId(): string {
  return env.AI_MODEL || DEFAULT_AI_MODEL;
}

function logSharedAiConfiguration() {
  if (hasLoggedSharedAiConfiguration) {
    return;
  }

  logger.info('[ai-model] using shared AI configuration', {
    provider: getSharedAiProvider(),
    modelId: getSharedAiModelId(),
  });

  hasLoggedSharedAiConfiguration = true;
}

function buildProviderClient(): ReturnType<typeof createOpenAI> {
  const provider = getSharedAiProvider();

  if (provider === 'openrouter') {
    if (!env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is required when AI_PROVIDER=openrouter');
    }
    return createOpenAI({
      apiKey: env.OPENROUTER_API_KEY,
      baseURL: OPENROUTER_BASE_URL,
      // Recommended headers for OpenRouter rankings / abuse prevention
      headers: {
        'HTTP-Referer': 'https://hominem.app',
        'X-Title': 'Hominem',
      },
    });
  }

  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required when AI_PROVIDER=openai');
  }

  return createOpenAI({ apiKey: env.OPENAI_API_KEY });
}

export function getSharedTextModel(options: SharedTextModelOptions = {}): LanguageModelV1 {
  const modelId = getSharedAiModelId();
  logSharedAiConfiguration();

  const client = buildProviderClient();

  return options.structuredOutputs === undefined
    ? client.chat(modelId)
    : client.chat(modelId, { structuredOutputs: options.structuredOutputs });
}

export function getSharedAiModelConfig() {
  return {
    provider: getSharedAiProvider(),
    modelId: getSharedAiModelId(),
  };
}

/**
 * Returns an AI SDK provider scoped to OpenAI directly — for use with
 * `experimental_generateSpeech` (tts-1).
 * OpenRouter does NOT proxy these endpoints.
 */
export function getOpenAIAudioProvider(): ReturnType<typeof createOpenAI> {
  if (!env.OPENAI_API_KEY) {
    throw new Error(
      'OPENAI_API_KEY is required for audio features (TTS/Whisper). OpenRouter does not proxy audio APIs.',
    );
  }
  return createOpenAI({ apiKey: env.OPENAI_API_KEY });
}

export function getSharedOpenAIClient(): OpenAI {
  logSharedAiConfiguration();
  const provider = getSharedAiProvider();

  if (provider === 'openrouter') {
    if (!env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is required when AI_PROVIDER=openrouter');
    }
    return new OpenAI({
      apiKey: env.OPENROUTER_API_KEY,
      baseURL: OPENROUTER_BASE_URL,
      defaultHeaders: {
        'HTTP-Referer': 'https://hominem.app',
        'X-Title': 'Hominem',
      },
    });
  }

  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required when AI_PROVIDER=openai');
  }

  return new OpenAI({ apiKey: env.OPENAI_API_KEY });
}
