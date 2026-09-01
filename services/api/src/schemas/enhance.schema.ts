import { z } from 'zod';

export const EnhanceTextInputSchema = z.object({
  text: z.string().min(1).max(8000),
  instruction: z.string().max(500).optional(),
});
