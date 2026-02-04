import 'dotenv/config';
import { z } from 'zod';

const isTest = process.env.NODE_ENV === 'test';

const envSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_URL: z.string().url().default('http://localhost:3000'),
  COOKIE_SECRET: z.string().default('supersecret'),
  DATABASE_URL: isTest
    ? z.string().url().default('postgresql://postgres:postgres@localhost:5432/hominem_test')
    : z.string().url(),

  FLORIN_URL: z.string().url().default('http://localhost:4444'),
  NOTES_URL: z.string().url().default('http://localhost:4445'),
  ROCCO_URL: z.string().url().default('http://localhost:4446'),

  SUPABASE_URL: isTest ? z.string().url().default('http://localhost:54321') : z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: isTest ? z.string().default('test-service-key') : z.string(),
  SUPABASE_ANON_KEY: isTest ? z.string().default('test-anon-key') : z.string(),

  GOOGLE_API_KEY: z.string().default(''),
  OPENAI_API_KEY: isTest ? z.string().default('test-openai-key') : z.string(),

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

export const env = new Proxy({} as z.infer<typeof envSchema>, {
  get(_target, prop) {
    const parsed = envSchema.parse(process.env);
    if (prop in parsed) {
      return parsed[prop as keyof z.infer<typeof envSchema>];
    }
    throw new Error(`Environment variable ${String(prop)} is not defined or invalid.`);
  },
});
