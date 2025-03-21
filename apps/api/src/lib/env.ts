import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  COOKIE_SECRET: z.string().default('supersecret'),
  CHROMA_URL: z.string().url(),
  CLERK_SECRET_KEY: z.string().default(''),
  CLERK_PUBLISHABLE_KEY: z.string().default(''),
  OPENAI_API_KEY: z.string(),
})

export const env = envSchema.parse(process.env)
