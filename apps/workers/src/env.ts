import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  REDIS_URL: z.string().default('redis://localhost:6379'),
  DATABASE_URL: z.string().url(),
  // Plaid API keys
  PLAID_CLIENT_ID: z.string().default(''),
  PLAID_API_KEY: z.string().default(''),
  PLAID_ENV: z.enum(['sandbox', 'development', 'production']).default('sandbox'),
})

export const env = envSchema.parse(process.env)
