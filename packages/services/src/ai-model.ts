import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModelV1 } from 'ai';
import OpenAI from 'openai';

import { env } from './env';

/** OpenRouter exposes an OpenAI-compatible API at this base URL. */
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

type SharedAiProvider = 'openai' | 'openrouter';

interface SharedTextModelOptions {
  structuredOutputs?: boolean;
}

function getSharedAiProvider(): SharedAiProvider {
  return env.AI_PROVIDER === 'openai' ? 'openai' : 'openrouter';
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
  const modelId = env.AI_MODEL;

  const client = buildProviderClient();

  return options.structuredOutputs === undefined
    ? client.chat(modelId)
    : client.chat(modelId, { structuredOutputs: options.structuredOutputs });
}

export function getSharedAiModelConfig() {
  return {
    provider: getSharedAiProvider(),
    modelId: env.AI_MODEL,
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
  return new OpenAI({
    apiKey: env.OPENROUTER_API_KEY,
    baseURL: OPENROUTER_BASE_URL,
    defaultHeaders: {
      'HTTP-Referer': 'https://hominem.app',
      'X-Title': 'Hominem',
    },
  });
}
