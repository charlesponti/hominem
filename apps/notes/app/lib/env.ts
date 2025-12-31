import { z } from 'zod'

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string(),
  VITE_SUPABASE_ANON_KEY: z.string(),
})

export const env = envSchema.parse(import.meta.env)
