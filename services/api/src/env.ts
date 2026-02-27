import 'dotenv/config';
import { createServerEnv } from '@hominem/env';
import * as z from 'zod';

const isTest = process.env.NODE_ENV === 'test';

const serverSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_URL: z.string().url().default('http://localhost:3000'),
  COOKIE_SECRET: z.string().default('supersecret'),
  DATABASE_URL: isTest
    ? z.string().url().default('postgresql://postgres:postgres@localhost:5432/hominem_test')
    : z.string().url(),

  FINANCE_URL: z.string().url().default('http://localhost:4444'),
  NOTES_URL: z.string().url().default('http://localhost:4445'),
  ROCCO_URL: z.string().url().default('http://localhost:4446'),
  AUTH_ISSUER: z.string().url().default('http://localhost:3000'),
  AUTH_AUDIENCE: z.string().default('hominem-api'),
  BETTER_AUTH_SECRET: z.string().default('dev-better-auth-secret-change-me'),
  BETTER_AUTH_URL: z.string().url().default('http://localhost:3000'),
  AUTH_COOKIE_DOMAIN: z.string().default(''),
  APPLE_CLIENT_ID: z.string().default(''),
  APPLE_CLIENT_SECRET: z.string().default(''),
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  AUTH_CAPTCHA_PROVIDER: z
    .enum(['cloudflare-turnstile', 'google-recaptcha', 'hcaptcha', 'captchafox'])
    .default('cloudflare-turnstile'),
  AUTH_CAPTCHA_SECRET_KEY: z.string().default(''),
  AUTH_E2E_ENABLED: z.coerce.boolean().default(false),
  AUTH_E2E_SECRET: z.string().default(''),

  SUPABASE_URL: isTest ? z.string().url().default('http://localhost:54321') : z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: isTest ? z.string().default('test-service-key') : z.string(),
  SUPABASE_ANON_KEY: isTest ? z.string().default('test-anon-key') : z.string(),

  GOOGLE_API_KEY: z.string().default(''),
  OPENAI_API_KEY: isTest ? z.string().default('test-openai-key') : z.string(),
  AI_SDK_CHAT_WEB_ENABLED: z.coerce.boolean().default(false),
  AI_SDK_CHAT_MOBILE_ENABLED: z.coerce.boolean().default(false),
  AI_SDK_TRANSCRIBE_ENABLED: z.coerce.boolean().default(false),
  AI_SDK_SPEECH_ENABLED: z.coerce.boolean().default(false),

  PLAID_CLIENT_ID: z.string().default(''),
  PLAID_API_KEY: z.string().default(''),
  PLAID_ENV: z.enum(['sandbox', 'development', 'production']).default('sandbox'),
  PLAID_WEBHOOK_SECRET: z.string().default(''),

  TWITTER_CLIENT_ID: z.string().default(''),
  TWITTER_CLIENT_SECRET: z.string().default(''),

  RESEND_API_KEY: z.string().default(''),
  RESEND_FROM_EMAIL: z.string().default(''),
  RESEND_FROM_NAME: z.string().default(''),
});

export const env = createServerEnv(serverSchema, 'apiServer');
