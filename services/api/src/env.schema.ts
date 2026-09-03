import { aiSchema } from '@hominem/env/ai';
import { databaseSchema } from '@hominem/env/database';
import { emailSchema } from '@hominem/env/email';
import { redisSchema } from '@hominem/env/redis';
import { runtimeSchema } from '@hominem/env/runtime';
import { storageSchema } from '@hominem/env/storage';
import { z } from 'zod';

export const apiSchema = runtimeSchema.extend({
  ...databaseSchema.shape,
  ...aiSchema.shape,
  ...emailSchema.shape,
  ...storageSchema.shape,
  ...redisSchema.shape,
  PORT: z.coerce.number().int().positive().optional(),
  WORKER_PORT: z.coerce.number().int().positive().optional(),
  API_URL: z.url().default('http://localhost:4040'),
  CAREER_URL: z.url().default('http://localhost:4451'),
  WEB_URL: z.url().default('http://localhost:4445'),
  FINANCE_URL: z.url().default('http://localhost:4444'),
  LABS_URL: z.url().default('https://labyrinth.lvh.me:4200'),
  LABS_APEX_URL: z.url().optional(),
  WHAT_URL: z.url().default('https://what.lvh.me:4200'),
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  AUTH_COOKIE_DOMAIN: z.string().default(''),
  HOMINEM_SCRIPTED_MAILBOX: z.string().default(''),
  AUTH_EMAIL_OTP_EXPIRES_SECONDS: z.coerce.number().int().positive().default(300),
  RESEND_API_KEY: z.string(),
  RESEND_FROM_EMAIL: z.string(),
  RESEND_FROM_NAME: z.string(),
  OPENROUTER_API_KEY: z.string(),
  SENTRY_DSN: z.string().optional(),
  OPENAI_APPS_CHALLENGE: z.string().optional(),
  SAVE_VOICE_AUDIO: z.stringbool().default(false),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.url().optional(),
  OTEL_EXPORTER_OTLP_PROTOCOL: z.string().optional(),
  OTEL_EXPORTER_OTLP_HEADERS: z.string().optional(),
  OTEL_TRACES_SAMPLER_ARG: z.coerce.number().default(1.0),
  PLAID_CLIENT_ID: z.string().default(''),
  PLAID_API_KEY: z.string().default(''),
  PLAID_ENV: z.enum(['sandbox', 'development', 'production']).default('sandbox'),
});

export type ApiEnv = z.infer<typeof apiSchema>;
