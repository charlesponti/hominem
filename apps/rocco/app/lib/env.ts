import { z } from 'zod'

const envSchema = z.object({
  VITE_APP_BASE_URL: z.string(),
  VITE_SUPABASE_URL: z.string(),
  VITE_SUPABASE_ANON_KEY: z.string(),
  VITE_GOOGLE_API_KEY: z.string(),
})

// Merge import.meta.env (Vite) with process.env as a fallback for test environments
const mergedEnv = {
  ...(typeof import.meta !== 'undefined' ? import.meta.env : {}),
  ...(typeof process !== 'undefined' && process.env ? process.env : {}),
}
export const env = envSchema.parse(mergedEnv)
