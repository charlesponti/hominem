import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_URL: z.string().url().default('http://localhost:3000'),
  COOKIE_SECRET: z.string().default('supersecret'),
  CHROMA_URL: z.string().optional(),

  APP_URL: z.string().url().default('http://localhost:4444'),
  ROCCO_URL: z.string().url().default('http://localhost:4454'),

  CLERK_SECRET_KEY: z.string(),
  CLERK_PUBLISHABLE_KEY: z.string(),

  GOOGLE_API_KEY: z.string(),
  OPENAI_API_KEY: z.string(),

  PLAID_CLIENT_ID: z.string().default(''),
  PLAID_SECRET: z.string().default(''),
  PLAID_ENV: z.enum(['sandbox', 'development', 'production']).default('sandbox'),
  PLAID_WEBHOOK_SECRET: z.string().default(''),
})

export const env = envSchema.parse(process.env)
