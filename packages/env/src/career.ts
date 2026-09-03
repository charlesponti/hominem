import { z } from 'zod';

import { baseSchema } from './base';

export const careerSchema = baseSchema.extend({
  // Public API origin the browser talks to (hosted login redirects, browser
  // RPC/WebSocket calls). See docs/authentication.md.
  VITE_PUBLIC_API_URL: z.url(),
  // Server-only API origin for SSR session checks and server-side data
  // calls. Required — don't fall back to VITE_PUBLIC_API_URL here, since a
  // missing prod value should crash the app rather than route SSR through
  // Cloudflare.
  HOMINEM_INTERNAL_API_URL: z.url(),
  // This app's own public origin, used to build hosted-login return URLs.
  PUBLIC_APP_URL: z.url(),
  // baseSchema declares these optional for services that don't need them;
  // career always talks to its own database and OpenRouter directly.
  DATABASE_URL: z.url(),
  OPENROUTER_API_KEY: z.string(),
});

export type CareerEnv = z.infer<typeof careerSchema>;

// Browser-safe subset — only VITE_* vars actually exist in import.meta.env,
// so client validation can't require the server-only database/auth/AI
// credentials above.
export const careerClientSchema = careerSchema.pick({
  VITE_PUBLIC_API_URL: true,
});

export type CareerClientEnv = z.infer<typeof careerClientSchema>;
