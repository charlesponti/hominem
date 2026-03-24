import 'dotenv/config';
import { createServerEnv } from '@hominem/env';
import * as z from 'zod';

const isTest = process.env.NODE_ENV === 'test';

const serverSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  API_URL: z.url().default('http://localhost:4040'),
  DATABASE_URL: isTest
    ? z.url().default('postgresql://postgres:postgres@localhost:5432/hominem_test')
    : z.url(),

  NOTES_URL: z.url().default('http://localhost:4445'),

  // AUTH
  COOKIE_SECRET: z.string().default('supersecret'),
  AUTH_ISSUER: z.url().default('http://localhost:3000'),
  AUTH_AUDIENCE: z.string().default('hominem-api'),
  BETTER_AUTH_SECRET: z.string().default('dev-better-auth-secret-change-me'),
  AUTH_PASSKEY_RP_ID: z.string().default('api.ponti.io'),
  AUTH_PASSKEY_ORIGIN: z.url().default('https://api.ponti.io'),
  AUTH_COOKIE_DOMAIN: z.string().default(''),
  AUTH_E2E_ENABLED: z.coerce.boolean().default(false),
  AUTH_E2E_SECRET: z.string().default(''),
  AUTH_TEST_OTP_ENABLED: isTest
    ? z.coerce.boolean().default(true)
    : z.coerce.boolean().default(false),
  AUTH_TEST_OTP_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  AUTH_EMAIL_OTP_EXPIRES_SECONDS: z.coerce.number().int().positive().default(300),

  TWITTER_CLIENT_ID: z.string().default(''),
  TWITTER_CLIENT_SECRET: z.string().default(''),

  // STORAGE
  R2_ENDPOINT: z.string().url().default(''),
  R2_BUCKET_NAME: z.string().default('hominem-storage'),
  R2_ACCESS_KEY_ID: z.string().default(''),
  R2_SECRET_ACCESS_KEY: z.string().default(''),

  // EMAIL
  RESEND_API_KEY: z.string(),
  RESEND_FROM_EMAIL: z.string(),
  RESEND_FROM_NAME: z.string(),
  SEND_EMAILS: z
    .enum(['true', 'false'])
    .default('false')
    .describe('Whether to actually send emails via Resend'),

  // SERVICES
  GOOGLE_API_KEY: z.string().default(''),
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),

  // AI — uses OpenRouter by default (200+ models, single API key)
  // Model IDs: provider/model-name — see https://openrouter.ai/models
  OPENROUTER_API_KEY: isTest ? z.string().default('test-openrouter-key') : z.string().optional(),
  AI_PROVIDER: z.enum(['openai', 'openrouter']).default('openrouter'),
  AI_MODEL: z.string().default('openai/gpt-4o-mini'),
  AI_SDK_CHAT_WEB_ENABLED: z.coerce.boolean().default(false),
  AI_SDK_CHAT_MOBILE_ENABLED: z.coerce.boolean().default(false),
  AI_SDK_TRANSCRIBE_ENABLED: z.coerce.boolean().default(false),
  AI_SDK_SPEECH_ENABLED: z.coerce.boolean().default(false),

  // FINANCE
  PLAID_CLIENT_ID: z.string().default(''),
  PLAID_API_KEY: z.string().default(''),
  PLAID_ENV: z.enum(['sandbox', 'development', 'production']).default('sandbox'),
  PLAID_WEBHOOK_SECRET: z.string().default(''),
});

export const env = createServerEnv(serverSchema, 'apiServer');
