import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  PORT: z.string().default('4040'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_URL: z.string().url().default('http://localhost:4040'),
  COOKIE_SECRET: z.string().default('supersecret'),

  ROCCO_URL: z.string().url().default('http://localhost:4454'),
  APP_URL: z.string().url().default('http://localhost:4444'),
  NOTES_URL: z.string().url().default('http://localhost:4445'),
  CHAT_URL: z.string().url().default('http://localhost:4446'),

  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),

  GOOGLE_API_KEY: z.string().default(''),
  OPENAI_API_KEY: z.string(),

  PLAID_CLIENT_ID: z.string().default(''),
  PLAID_API_KEY: z.string().default(''),
  PLAID_ENV: z.enum(['sandbox', 'development', 'production']).default('sandbox'),
  PLAID_WEBHOOK_SECRET: z.string().default(''),

  TWITTER_CLIENT_ID: z.string().default(''),
  TWITTER_CLIENT_SECRET: z.string().default(''),
})

export const env = new Proxy({} as z.infer<typeof envSchema>, {
  get(target, prop) {
    const parsed = envSchema.parse(process.env)
    if (prop in parsed) {
      return parsed[prop as keyof z.infer<typeof envSchema>]
    }
    throw new Error(`Environment variable ${String(prop)} is not defined or invalid.`)
  },
})
