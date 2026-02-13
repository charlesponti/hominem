import 'dotenv/config';
import * as z from 'zod';

const envSchema = z.object({
  APP_BASE_URL: z.url(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  DATABASE_URL: z.string().url(),
  GOOGLE_API_KEY: z.string(),
  // Plaid API keys
  PLAID_CLIENT_ID: z.string().default(''),
  PLAID_API_KEY: z.string().default(''),
  PLAID_ENV: z.enum(['sandbox', 'development', 'production']).default('sandbox'),
  // Supabase configuration for file storage
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
});

export const env = envSchema.parse(process.env);
