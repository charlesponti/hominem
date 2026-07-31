import { baseSchema } from '@hominem/env/base';
import 'dotenv/config';
import { z } from 'zod';

const serverEnvSchema = baseSchema.extend({
  DATABASE_URL: z.url(),
  VITE_PUBLIC_API_URL: z.url(),
  OPENROUTER_API_KEY: z.string(),
});

export const serverEnv = serverEnvSchema.parse(process.env);
