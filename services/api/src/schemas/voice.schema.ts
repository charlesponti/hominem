import * as z from 'zod';

const VoiceCleanupSourceSchema = z.enum(['apple-on-device']);

export const VoiceCleanupInputSchema = z.object({
  rawText: z.string().min(1).max(8000),
  locale: z.string().min(2).max(32).optional(),
  source: VoiceCleanupSourceSchema,
});

export const VoiceCleanupOutputSchema = z.object({
  rawText: z.string(),
  cleanedText: z.string(),
  changed: z.boolean(),
  mode: z.literal('constrained'),
});
export type VoiceCleanupInput = z.infer<typeof VoiceCleanupInputSchema>;
export type VoiceCleanupOutput = z.infer<typeof VoiceCleanupOutputSchema>;
