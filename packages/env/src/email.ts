import { z } from 'zod';

export const emailSchema = z.object({
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),
  RESEND_FROM_NAME: z.string().optional(),
});

export type EmailEnv = z.infer<typeof emailSchema>;
