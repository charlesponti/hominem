import { z } from 'zod';

export const browserSpeechTelemetrySchema = z
  .object({
    version: z.literal(1),
    type: z.literal('speech_playback'),
    outcome: z.enum(['completed', 'stopped', 'failed']),
    requestToFirstPlayableMs: z.number().int().min(0).max(120_000).nullable(),
    sessionDurationMs: z.number().int().min(0).max(600_000),
  })
  .strict();

export type BrowserSpeechTelemetry = z.infer<typeof browserSpeechTelemetrySchema>;
