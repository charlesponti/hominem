import { databaseSchema } from '@hominem/env/database';
import { runtimeSchema } from '@hominem/env/runtime';
import { z } from 'zod';

export const careerSchema = runtimeSchema.extend({
  ...databaseSchema.shape,
  VITE_PUBLIC_API_URL: z.url(),
  HOMINEM_INTERNAL_API_URL: z.url(),
  PUBLIC_APP_URL: z.url(),
  DATABASE_URL: z.url(),
  OPENROUTER_API_KEY: z.string(),
});

export const careerClientSchema = careerSchema.pick({
  VITE_PUBLIC_API_URL: true,
});

export type CareerEnv = z.infer<typeof careerSchema>;
export type CareerClientEnv = z.infer<typeof careerClientSchema>;
