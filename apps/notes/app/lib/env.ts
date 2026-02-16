import * as z from 'zod';
import { createClientEnv, createServerEnv } from '@hominem/env';

const clientSchema = z.object({
  VITE_PUBLIC_API_URL: z.string().url(),
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
});

const serverSchema = z.object({
  VITE_PUBLIC_API_URL: z.string().url(),
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
  VITE_SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().optional(),
});

export const clientEnv = createClientEnv(clientSchema, 'notesClient');
export const serverEnv = createServerEnv(serverSchema, 'notesServer');

export type ClientEnv = z.infer<typeof clientSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;
