import { z } from 'zod';

import {
  VOICE_CLEANUP_MODEL,
  normalizeOpenRouterError,
  type OpenRouterClientOptions,
} from './shared';
import {
  createStructuredChatCompletion,
  StructuredOutputError as AITextStructuredOutputError,
} from './text';

type VoiceTranscriptCleanupInput = OpenRouterClientOptions & {
  rawText: string;
  locale?: string;
  model?: string;
};

export type VoiceTranscriptCleanupOutput = {
  cleanedText: string;
};

type VoiceTranscriptCleanupResult = VoiceTranscriptCleanupOutput & {
  usage: import('./shared').AIUsageMetrics | null;
};

const VOICE_TRANSCRIPT_CLEANUP_SYSTEM_PROMPT = [
  'You clean up raw on-device speech transcripts.',
  'Preserve the user meaning, names, numbers, dates, and intent.',
  'Fix casing, punctuation, spacing, repeated filler fragments, and obvious speech recognition artifacts.',
  'Do not summarize, expand, add facts, or heavily paraphrase.',
  'If you are uncertain, return the original transcript unchanged.',
  'Return only the JSON required by the schema.',
].join(' ');

const VoiceTranscriptCleanupOutputSchema = z.object({
  cleanedText: z.string(),
});

export function parseVoiceTranscriptCleanupOutput(value: unknown): VoiceTranscriptCleanupOutput {
  return VoiceTranscriptCleanupOutputSchema.parse(value);
}

export async function cleanupVoiceTranscript(
  input: VoiceTranscriptCleanupInput,
): Promise<VoiceTranscriptCleanupResult> {
  const model = input.model ?? VOICE_CLEANUP_MODEL;

  try {
    const { output, usage } = await createStructuredChatCompletion(
      {
        model,
        schema: VoiceTranscriptCleanupOutputSchema,
        schemaName: 'voice_transcript_cleanup',
        schemaDescription: 'A minimally cleaned voice transcript preserving original meaning.',
        messages: [
          { role: 'system', content: VOICE_TRANSCRIPT_CLEANUP_SYSTEM_PROMPT },
          {
            role: 'user',
            content: JSON.stringify({
              rawText: input.rawText,
              ...(input.locale ? { locale: input.locale } : {}),
            }),
          },
        ],
      },
      input,
    );

    return {
      ...parseVoiceTranscriptCleanupOutput(output),
      usage,
    };
  } catch (error) {
    if (error instanceof AITextStructuredOutputError) {
      throw error;
    }

    throw normalizeOpenRouterError(error);
  }
}
