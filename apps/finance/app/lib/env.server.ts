import { z } from 'zod';

const serverEnvSchema = z.object({
  HOMINEM_INTERNAL_API_URL: z.url(),
  PUBLIC_APP_URL: z.url(),
  VITE_PUBLIC_API_URL: z.url(),
});

export const serverEnv = serverEnvSchema.parse(process.env);
