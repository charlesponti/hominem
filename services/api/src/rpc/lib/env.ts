import { createServerEnv } from '@hominem/env'
import * as z from 'zod'

const isTest = process.env.NODE_ENV === 'test'

const envSchema = z.object({
  PORT: z.string().default('4040'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_URL: z.string().url().default('http://localhost:4040'),
  COOKIE_SECRET: z.string().default('supersecret'),
  DATABASE_URL: isTest
    ? z.string().url().default('postgresql://postgres:postgres@localhost:5432/hominem_test')
    : z.string().url(),

  NOTES_URL: z.string().url().default('http://localhost:4445'),

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
  SEND_EMAILS: z.enum(['true', 'false']).default('false').describe('Whether to actually send emails via Resend'),
})

export const env = createServerEnv(envSchema, 'honoRpc')
