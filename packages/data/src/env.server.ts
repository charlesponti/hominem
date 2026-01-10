import { z } from 'zod'

/**
 * Server-side environment variable validation and parsing for @hominem/data
 *
 * This module reads from both `process.env` and `import.meta.env` and produces a
 * strongly-typed `env` object. It intentionally avoids throwing at import time
 * (useful for libraries) but provides a `getRequiredEnv` helper to assert the
 * presence of mandatory variables at runtime.
 */

const rawEnvSchema = z
  .object({
    // App Base URL for constructing referrers/callbacks
    VITE_APP_BASE_URL: z.string().optional(),

    // Supabase
    SUPABASE_URL: z.string().optional(),
    VITE_SUPABASE_URL: z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

    // Google
    GOOGLE_API_KEY: z.string().optional(),
    VITE_GOOGLE_API_KEY: z.string().optional(),
  })
  .loose()

const normalizedSchema = rawEnvSchema.transform((data) => ({
  APP_BASE_URL: data.VITE_APP_BASE_URL ?? 'http://localhost:3000',
  SUPABASE_URL: data.SUPABASE_URL ?? data.VITE_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: data.SUPABASE_SERVICE_ROLE_KEY,
  GOOGLE_API_KEY: data.GOOGLE_API_KEY ?? data.VITE_GOOGLE_API_KEY,
}))

type Env = z.infer<typeof normalizedSchema>

// Support both Node.js process.env and Vite's import.meta.env
type ViteEnvValue = string | number | boolean | undefined
type ImportMetaWithEnv = { env?: Record<string, ViteEnvValue> }

const getEnvVar = (key: string): string | undefined => {
  if (typeof process !== 'undefined' && typeof process.env !== 'undefined' && process.env[key]) {
    return process.env[key]
  }

  if (typeof import.meta !== 'undefined') {
    const meta = import.meta as unknown as ImportMetaWithEnv
    const raw = meta.env?.[key]
    if (raw === undefined || raw === null) {
      return undefined
    }
    return typeof raw === 'string' ? raw : String(raw)
  }

  return undefined
}

const rawEnv = {
  VITE_APP_BASE_URL: getEnvVar('VITE_APP_BASE_URL'),
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_URL: getEnvVar('VITE_SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: getEnvVar('SUPABASE_SERVICE_ROLE_KEY'),
  GOOGLE_API_KEY: getEnvVar('GOOGLE_API_KEY'),
  VITE_GOOGLE_API_KEY: getEnvVar('VITE_GOOGLE_API_KEY'),
}

const parsed = normalizedSchema.safeParse(rawEnv)

if (!parsed.success) {
  // In a library package, we prefer to warn at import time instead of crashing.
  // Consumers can call `getRequiredEnv` to assert presence of required values.
  console.warn(
    'Invalid environment variables in @hominem/data:',
    parsed.error.flatten().fieldErrors
  )
}

export const env: Env = parsed.success
  ? parsed.data
  : {
      APP_BASE_URL: 'http://localhost:3000',
      SUPABASE_URL: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
      GOOGLE_API_KEY: undefined,
    }

/**
 * Helper to assert presence of a required env value at runtime.
 * Use when a missing value should be considered a fatal misconfiguration.
 */
export function getRequiredEnv<K extends keyof Env>(key: K): NonNullable<Env[K]> {
  const value = env[key]
  if (value == null || value === '') {
    throw new Error(`Missing required environment variable: ${String(key)}`)
  }
  return value as NonNullable<Env[K]>
}
