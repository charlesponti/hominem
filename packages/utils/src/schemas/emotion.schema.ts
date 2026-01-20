import { z } from 'zod';

export const TextAnalysisEmotionSchema = z.object({
  emotion: z.string(),
  intensity: z.number(),
});

export type TextAnalysisEmotion = z.infer<typeof TextAnalysisEmotionSchema>;
