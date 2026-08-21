import * as z from 'zod';

import { baseSchema } from './base';

export const webSchema = baseSchema.extend({
  // Browser-facing public API origin (hosted login redirects, Better Auth
  // browser client, browser RPC/file calls). See docs/auth-production.md.
  VITE_PUBLIC_API_URL: z.url(),
  // Server-only API origin for SSR session resolution and server-side data
  // calls. Required — never fall back to VITE_PUBLIC_API_URL: a missing
  // production value must stop the app instead of routing SSR through
  // Cloudflare.
  HOMINEM_INTERNAL_API_URL: z.url(),
  // Explicit public origin of this app, used for hosted-login return URLs.
  PUBLIC_APP_URL: z.url(),
  VITE_POSTHOG_PUBLIC_KEY: z.string().optional(),
  VITE_POSTHOG_HOST: z.url().optional().default('https://us.i.posthog.com'),
  VITE_OTEL_DISABLED: z.enum(['true', 'false']).optional().default('false'),
  VITE_OTEL_SERVICE_NAME: z.string().optional().default('web'),
  VITE_OTEL_SERVICE_VERSION: z.string().optional().default('0.0.0'),
  VITE_OTEL_DEPLOYMENT_ENVIRONMENT: z.string().optional().default('development'),
  VITE_OTEL_EXPORTER_OTLP_ENDPOINT: z
    .union([z.literal('none'), z.url()])
    .optional()
    .default('none'),
  VITE_OTEL_TRACES_SAMPLER_ARG: z.string().optional().default('1.0'),
});

export type WebEnv = z.infer<typeof webSchema>;

// Browser-safe subset: only VITE_* vars exist in import.meta.env, so client
// validation must not require the server-only auth URLs above.
export const webClientSchema = webSchema.pick({
  VITE_PUBLIC_API_URL: true,
  VITE_POSTHOG_PUBLIC_KEY: true,
  VITE_POSTHOG_HOST: true,
  VITE_OTEL_DISABLED: true,
  VITE_OTEL_SERVICE_NAME: true,
  VITE_OTEL_SERVICE_VERSION: true,
  VITE_OTEL_DEPLOYMENT_ENVIRONMENT: true,
  VITE_OTEL_EXPORTER_OTLP_ENDPOINT: true,
  VITE_OTEL_TRACES_SAMPLER_ARG: true,
});

export type WebClientEnv = z.infer<typeof webClientSchema>;
