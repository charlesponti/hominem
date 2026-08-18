import {
  cleanupVoiceTranscript,
  OpenRouterRequestError,
  StructuredOutputError,
  type AIUsageMetrics,
  type VoiceTranscriptCleanupOutput,
} from '@hominem/ai';
import { logger } from '@hominem/telemetry';

import {
  VoiceCleanupOutputSchema,
  type VoiceCleanupInput,
  type VoiceCleanupOutput,
} from '../../schemas/voice.schema';

const VOICE_CLEANUP_MIN_LENGTH = 8;
const VOICE_CLEANUP_MIN_WORDS = 2;
const VOICE_CLEANUP_MIN_LENGTH_RATIO = 0.45;
const VOICE_CLEANUP_MAX_LENGTH_RATIO = 2.5;

type VoiceCleanupProviderError = {
  kind: 'provider-error';
  message: string;
  status: 401 | 429;
  error: unknown;
};

export type VoiceCleanupServiceResult =
  | { kind: 'success'; output: VoiceCleanupOutput; usage: AIUsageMetrics | null }
  | VoiceCleanupProviderError;

type VoiceCleanupDependencies = {
  cleanupTranscript: (input: {
    rawText: string;
    locale?: string;
  }) => Promise<VoiceTranscriptCleanupOutput & { usage: AIUsageMetrics | null }>;
  logError: (message: string, context: Record<string, unknown>) => void;
};

const DEFAULT_DEPS: VoiceCleanupDependencies = {
  cleanupTranscript: cleanupVoiceTranscript,
  logError: (message, context) => logger.error(message, context),
};

function countTranscriptWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function shouldBypassVoiceCleanup(text: string) {
  const trimmed = text.trim();
  return (
    trimmed.length < VOICE_CLEANUP_MIN_LENGTH ||
    countTranscriptWords(trimmed) < VOICE_CLEANUP_MIN_WORDS
  );
}

export function isSafeVoiceCleanup(rawText: string, cleanedText: string) {
  const rawTrimmed = rawText.trim();
  const cleanedTrimmed = cleanedText.trim();

  if (!cleanedTrimmed) return false;

  const rawLength = rawTrimmed.length;
  const cleanedLength = cleanedTrimmed.length;

  if (rawLength === 0) return false;

  const lengthRatio = cleanedLength / rawLength;
  if (
    lengthRatio < VOICE_CLEANUP_MIN_LENGTH_RATIO ||
    lengthRatio > VOICE_CLEANUP_MAX_LENGTH_RATIO
  ) {
    return false;
  }

  const rawWords = countTranscriptWords(rawTrimmed);
  const cleanedWords = countTranscriptWords(cleanedTrimmed);

  if (rawWords >= 6 && cleanedWords < Math.ceil(rawWords / 2)) {
    return false;
  }

  return true;
}

export function buildFallbackOutput(rawText: string) {
  return VoiceCleanupOutputSchema.parse({
    rawText,
    cleanedText: rawText,
    changed: false,
    mode: 'constrained',
  });
}

function getVoiceCleanupErrorStatus(error: unknown) {
  if (error instanceof OpenRouterRequestError) {
    return error.status;
  }

  if (typeof error === 'object' && error !== null && 'statusCode' in error) {
    const statusCode = (error as { statusCode?: unknown }).statusCode;
    return typeof statusCode === 'number' ? statusCode : undefined;
  }

  return undefined;
}

export async function cleanupVoiceInput(
  input: VoiceCleanupInput,
  deps: VoiceCleanupDependencies = DEFAULT_DEPS,
): Promise<VoiceCleanupServiceResult> {
  const rawText = input.rawText.trim();

  if (shouldBypassVoiceCleanup(rawText)) {
    return {
      kind: 'success',
      output: buildFallbackOutput(rawText),
      usage: null,
    };
  }

  try {
    const { cleanedText, usage } = await deps.cleanupTranscript({
      rawText,
      ...(input.locale ? { locale: input.locale } : {}),
    });
    const normalizedCleanedText = cleanedText.trim();
    const safeCleanedText = isSafeVoiceCleanup(rawText, normalizedCleanedText)
      ? normalizedCleanedText
      : rawText;

    return {
      kind: 'success',
      output: VoiceCleanupOutputSchema.parse({
        rawText,
        cleanedText: safeCleanedText,
        changed: safeCleanedText !== rawText,
        mode: 'constrained',
      }),
      usage,
    };
  } catch (error) {
    if (error instanceof StructuredOutputError) {
      return {
        kind: 'success',
        output: buildFallbackOutput(rawText),
        usage: error.usage,
      };
    }

    deps.logError('[voice-cleanup] cleanup failed', {
      source: input.source,
      locale: input.locale,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    const status = getVoiceCleanupErrorStatus(error);
    if (status === 401 || status === 429) {
      return {
        kind: 'provider-error',
        message: error instanceof Error ? error.message : 'Voice cleanup failed',
        status,
        error,
      };
    }

    return {
      kind: 'success',
      output: buildFallbackOutput(rawText),
      usage: null,
    };
  }
}
