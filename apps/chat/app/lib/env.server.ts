import { config } from 'dotenv'
import { z } from 'zod'

// Load environment variables from .env files
config()

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('4446'),
  API_URL: z.string().url().default('http://localhost:4040'),
})

function validateEnv() {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    console.error('❌ Invalid environment variables:')
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`)
    }
    console.error('\n💡 Make sure to set up your .env file with the required variables')
    process.exit(1)
  }

  return result.data
}

export const env = validateEnv()

// Re-export for convenience
export const { DATABASE_URL, NODE_ENV, PORT, API_URL } = env
