import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url().optional(),
  DB_MAX_CONNECTIONS: z.coerce.number().optional(),
  DB_IDLE_TIMEOUT: z.coerce.number().optional(),
  DB_MAX_LIFETIME: z.coerce.number().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  VITE_GOOGLE_API_KEY: z.string().optional(),
  VITE_APP_BASE_URL: z.string().url().optional(),
  APP_BASE_URL: z.string().url().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
  REDIS_URL: z.string().url().optional().default('redis://localhost:6379'),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),
  RESEND_FROM_NAME: z.string().optional(),
});

const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  get NODE_ENV() {
    return (process.env.NODE_ENV as 'development' | 'production' | 'test') || parsedEnv.NODE_ENV;
  },
};
