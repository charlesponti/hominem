import { createClientEnv, createServerEnv } from '@hominem/env';
import * as z from 'zod';

const serverSchema = z.object({
  VITE_PUBLIC_API_URL: z.string().url(),
  VITE_R2_DOMAIN: z.string().optional(),
  PLAID_CLIENT_ID: z.string().optional(),
  PLAID_API_KEY: z.string().optional(),
  PLAID_ENV: z.enum(['sandbox', 'development', 'production']).default('sandbox'),
});

function createEnv() {
  try {
    return createServerEnv(serverSchema, 'financeServer');
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('createServerEnv can only be used in Node.js context')
    ) {
      // Running in browser — server env not available
      return createClientEnv(serverSchema, 'financeServer');
    }
    throw error;
  }
}

export const serverEnv = createEnv();

// Client-side env — read from import.meta.env directly (no validation at module scope)
export const clientEnv = {
  VITE_PUBLIC_API_URL: import.meta.env.VITE_PUBLIC_API_URL,
  VITE_R2_DOMAIN: import.meta.env.VITE_R2_DOMAIN,
};
