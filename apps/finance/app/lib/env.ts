import { createClientEnv, createServerEnv } from '@hominem/env';
import * as z from 'zod';

const clientSchema = z.object({
  VITE_PUBLIC_API_URL: z.string().url(),
  VITE_R2_DOMAIN: z.string().optional(),
});

const serverSchema = z.object({
  VITE_PUBLIC_API_URL: z.string().url(),
  VITE_R2_DOMAIN: z.string().optional(),
  AUTH_COOKIE_DOMAIN: z.string().optional(),
  PLAID_CLIENT_ID: z.string().optional(),
  PLAID_API_KEY: z.string().optional(),
  PLAID_ENV: z.enum(['sandbox', 'development', 'production']).default('sandbox'),
});

void createClientEnv(clientSchema, 'financeClient');
export const serverEnv = createServerEnv(serverSchema, 'financeServer');
