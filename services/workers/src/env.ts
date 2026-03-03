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
  // R2 configuration for file storage
  R2_ENDPOINT: z.string().url(),
  R2_BUCKET_NAME: z.string().default('hominem-storage'),
  R2_ACCESS_KEY_ID: z.string(),
  R2_SECRET_ACCESS_KEY: z.string(),
});

export const env = envSchema.parse(process.env);
