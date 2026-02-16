import * as z from 'zod';
import { createClientEnv, createServerEnv } from '@hominem/env';

const clientSchema = z.object({
  VITE_PUBLIC_API_URL: z.string().url(),
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
  VITE_APP_BASE_URL: z.string().url(),
  VITE_GOOGLE_API_KEY: z.string().min(1),
  VITE_GOOGLE_MAP_ID: z.string().optional().default('DEMO_MAP_ID'),
});

const serverSchema = z.object({
  VITE_PUBLIC_API_URL: z.string().url(),
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
  VITE_SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

export const clientEnv = createClientEnv(clientSchema, 'roccoClient');
export const serverEnv = createServerEnv(serverSchema, 'roccoServer');

export type ClientEnv = z.infer<typeof clientSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;
