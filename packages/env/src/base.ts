import * as z from 'zod';

// Shared by every Node server package (services/api, packages/db,
// packages/storage, packages/services, packages/ai, apps/career's server
// env, ...). Extend this instead of re-declaring these fields locally —
// duplicate schemas invite drift — fields end up with different defaults
// across packages and nobody notices until a production incident.
export const baseSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.url().optional(),
  DB_MAX_CONNECTIONS: z.coerce.number().int().positive().optional(),
  DB_IDLE_TIMEOUT: z.coerce.number().int().positive().optional(),
  DB_MAX_LIFETIME: z.coerce.number().int().positive().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),
  RESEND_FROM_NAME: z.string().optional(),
  R2_ENDPOINT: z.url().default('http://localhost:9000'),
  R2_BUCKET_NAME: z.string().min(1).default('storage'),
  R2_ACCESS_KEY_ID: z.string().min(1).default('minioadmin'),
  R2_SECRET_ACCESS_KEY: z.string().min(1).default('minioadmin'),
  R2_PUBLIC_URL: z.url().default('http://localhost:9000'),
  REDIS_URL: z.url().default('redis://localhost:6379'),

  // Models
  AUDIO_TTS_MODEL: z.string().default('hexgrad/kokoro-82m'),
  CHAT_MODEL: z.string().default('google/gemini-2.5-flash-lite'),
  EMBEDDING_MODEL: z.string().default('google/gemini-embedding-2'),
  ENHANCE_MODEL: z.string().default('google/gemini-2.5-flash-lite'),
  JOB_EXTRACTION_MODEL: z.string().default('google/gemini-2.5-flash-lite'),
  TASK_EXTRACTION_MODEL: z.string().default('google/gemini-2.5-flash-lite'),
  TIME_BLOCK_EXTRACTION_MODEL: z.string().default('google/gemini-2.5-flash-lite'),
  VOICE_CLEANUP_MODEL: z.string().default('google/gemini-2.5-flash-lite'),
});

export type BaseEnv = z.infer<typeof baseSchema>;
