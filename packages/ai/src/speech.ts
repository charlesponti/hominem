import {
  AUDIO_TTS_MODEL,
  AUDIO_TTS_VOICE,
  createOpenRouterClient,
  normalizeOpenRouterError,
} from './shared';
import type { OpenRouterClientOptions } from './shared';

type SynthesizeSpeechInput = OpenRouterClientOptions & {
  text: string;
  model?: string;
  voice?: string;
  responseFormat?: 'mp3' | 'pcm';
};

type SynthesizeSpeechResult = {
  buffer: Buffer;
  mimeType: string;
  generationId: string | null;
};

type SpeechRequestInspection = {
  response?: Response;
};

type SpeechRequestPromise = Promise<ReadableStream<Uint8Array>> & {
  $inspect: () => Promise<[ReadableStream<Uint8Array>, SpeechRequestInspection]>;
};

export type SynthesizeSpeechStreamResult = {
  stream: ReadableStream<Uint8Array>;
  mimeType: string;
  generationId: string | null;
};

export type SpeechGenerationUsage = {
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

export type SpeechUsageEstimate = SpeechGenerationUsage & {
  characterCount: number;
  costPerCharacterUsd: number;
  costSource: 'openrouter_model_catalog';
};

const RESPONSE_FORMAT_MIME_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg',
  pcm: 'audio/L16',
};

const SPEECH_REQUEST_TIMEOUT_MS = 15_000;
const SPEECH_PRICING_CACHE_TTL_MS = 5 * 60 * 1000;

const speechPricingCache = new Map<string, { costPerCharacterUsd: number; expiresAt: number }>();

async function getSpeechCostPerCharacter(
  input: OpenRouterClientOptions & { model: string },
): Promise<number> {
  const cached = speechPricingCache.get(input.model);
  if (cached && cached.expiresAt > Date.now()) return cached.costPerCharacterUsd;

  const client = createOpenRouterClient(input);
  const response = await client.models.list({ outputModalities: 'speech' });
  const model = response.data.find(
    (candidate) => candidate.id === input.model || candidate.canonicalSlug === input.model,
  );
  const costPerCharacterUsd = Number(model?.pricing.prompt);

  if (!model || !Number.isFinite(costPerCharacterUsd) || costPerCharacterUsd < 0) {
    throw new Error(`Speech pricing unavailable for model ${input.model}`);
  }

  speechPricingCache.set(input.model, {
    costPerCharacterUsd,
    expiresAt: Date.now() + SPEECH_PRICING_CACHE_TTL_MS,
  });
  return costPerCharacterUsd;
}

export async function getSpeechUsageEstimate(
  input: OpenRouterClientOptions & { model: string; characterCount: number },
): Promise<SpeechUsageEstimate> {
  if (!Number.isInteger(input.characterCount) || input.characterCount < 0) {
    throw new Error('Speech character count must be a non-negative integer');
  }

  const costPerCharacterUsd = await getSpeechCostPerCharacter(input);
  return {
    provider: 'openrouter',
    model: input.model,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    reportedTotalTokens: null,
    costUsd: Number((input.characterCount * costPerCharacterUsd).toFixed(12)),
    cachedPromptTokens: null,
    reasoningTokens: null,
    characterCount: input.characterCount,
    costPerCharacterUsd,
    costSource: 'openrouter_model_catalog',
  };
}

// TTS-only models aren't chat models, so this goes through the SDK's dedicated
// `tts.createSpeech` client rather than `chat()`.
export async function synthesizeSpeechStream(
  input: SynthesizeSpeechInput,
): Promise<SynthesizeSpeechStreamResult> {
  let generationId: string | null = null;
  const client = createOpenRouterClient({
    ...input,
    responseHook: (response) => {
      generationId = response.headers.get('x-generation-id');
    },
  });
  const model = input.model ?? AUDIO_TTS_MODEL;
  const responseFormat = input.responseFormat ?? 'mp3';

  let stream: ReadableStream<Uint8Array>;
  try {
    const request = client.tts.createSpeech(
      {
        speechRequest: {
          input: input.text,
          model,
          voice: input.voice ?? AUDIO_TTS_VOICE,
          responseFormat,
        },
      },
      { timeoutMs: SPEECH_REQUEST_TIMEOUT_MS },
    ) as SpeechRequestPromise;
    stream = await request;

    if (!generationId && typeof request.$inspect === 'function') {
      const [, call] = await request.$inspect();
      generationId = call.response?.headers.get('X-Generation-Id') ?? null;
    }

    return {
      stream,
      mimeType: RESPONSE_FORMAT_MIME_TYPES[responseFormat] ?? 'audio/mpeg',
      generationId,
    };
  } catch (error) {
    throw normalizeOpenRouterError(error);
  }
}

export async function getSpeechGenerationUsage(
  input: OpenRouterClientOptions & { generationId: string },
): Promise<SpeechGenerationUsage> {
  const client = createOpenRouterClient(input);
  const response = await client.generations.getGeneration({ id: input.generationId });
  const data = response.data;
  const promptTokens = data.tokensPrompt ?? data.nativeTokensPrompt ?? 0;
  const completionTokens = data.tokensCompletion ?? data.nativeTokensCompletion ?? 0;

  return {
    provider: 'openrouter',
    model: data.model,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    reportedTotalTokens: null,
    costUsd: data.totalCost,
    cachedPromptTokens: data.nativeTokensCached,
    reasoningTokens: data.nativeTokensReasoning,
  };
}

export async function synthesizeSpeech(
  input: SynthesizeSpeechInput,
): Promise<SynthesizeSpeechResult> {
  const { stream, mimeType, generationId } = await synthesizeSpeechStream(input);
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  return {
    buffer: Buffer.concat(chunks),
    mimeType,
    generationId,
  };
}
