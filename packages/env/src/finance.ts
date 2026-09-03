import { z } from 'zod';

import { baseSchema } from './base';

export const financeSchema = baseSchema.extend({
  // Public API origin the browser talks to (hosted login redirects, browser
  // RPC calls). See docs/authentication.md.
  VITE_PUBLIC_API_URL: z.url(),
  // Server-only API origin for SSR session checks and server-side data
  // calls. Required — don't fall back to VITE_PUBLIC_API_URL here, since a
  // missing prod value should crash the app rather than route SSR through
  // Cloudflare.
  HOMINEM_INTERNAL_API_URL: z.url(),
  // This app's own public origin, used to build hosted-login return URLs.
  PUBLIC_APP_URL: z.url(),
  VITE_R2_DOMAIN: z.string().optional(),
  PLAID_CLIENT_ID: z.string().optional(),
  PLAID_API_KEY: z.string().optional(),
  PLAID_ENV: z.enum(['sandbox', 'development', 'production']).default('sandbox'),
});

export type FinanceEnv = z.infer<typeof financeSchema>;

// Browser-safe subset — only VITE_* vars actually exist in import.meta.env,
// so client validation can't require the server-only auth URLs or Plaid
// credentials above.
export const financeClientSchema = financeSchema.pick({
  VITE_PUBLIC_API_URL: true,
  VITE_R2_DOMAIN: true,
});

export type FinanceClientEnv = z.infer<typeof financeClientSchema>;
