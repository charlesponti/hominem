import { z } from 'zod';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string(),
  VITE_SUPABASE_ANON_KEY: z.string(),
});

// For Vite, environment variables are available on import.meta.env
export const env = envSchema.parse(import.meta.env);
