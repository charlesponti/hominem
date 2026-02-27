import { createClientEnv, createServerEnv } from '@hominem/env';
import * as z from 'zod';

const clientSchema = z.object({
  VITE_PUBLIC_API_URL: z.string().url(),
  VITE_SUPABASE_URL: z.string().url().optional(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  VITE_FEATURE_AI_SDK_CHAT_WEB: z.string().optional(),
  VITE_FEATURE_AI_SDK_CHAT_MOBILE: z.string().optional(),
  VITE_FEATURE_AI_SDK_TRANSCRIBE: z.string().optional(),
  VITE_FEATURE_AI_SDK_SPEECH: z.string().optional(),
});

const serverSchema = z.object({
  VITE_PUBLIC_API_URL: z.string().url(),
  VITE_SUPABASE_URL: z.string().url().optional(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().optional(),
  VITE_FEATURE_AI_SDK_CHAT_WEB: z.string().optional(),
  VITE_FEATURE_AI_SDK_CHAT_MOBILE: z.string().optional(),
  VITE_FEATURE_AI_SDK_TRANSCRIBE: z.string().optional(),
  VITE_FEATURE_AI_SDK_SPEECH: z.string().optional(),
});

export const clientEnv = createClientEnv(clientSchema, 'notesClient');
export const serverEnv = createServerEnv(serverSchema, 'notesServer');

export type ClientEnv = z.infer<typeof clientSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;
