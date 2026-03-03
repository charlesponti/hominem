import { createClientEnv, createServerEnv } from '@hominem/env';
import * as z from 'zod';

const clientSchema = z.object({
  VITE_PUBLIC_API_URL: z.string().url(),
  VITE_R2_DOMAIN: z.string().optional(),
  VITE_APP_BASE_URL: z.string().url(),
  VITE_GOOGLE_API_KEY: z.string().min(1),
  VITE_GOOGLE_MAP_ID: z.string().optional().default('DEMO_MAP_ID'),
});

const serverSchema = z.object({
  VITE_PUBLIC_API_URL: z.string().url(),
  VITE_R2_DOMAIN: z.string().optional(),
  VITE_GOOGLE_API_KEY: z.string().min(1),
  VITE_APP_BASE_URL: z.string().url(),
});

export const clientEnv = createClientEnv(clientSchema, 'roccoClient');
export const serverEnv = createServerEnv(serverSchema, 'roccoServer');

type ClientEnv = z.infer<typeof clientSchema>;
type ServerEnv = z.infer<typeof serverSchema>;
