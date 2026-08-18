import * as z from 'zod';

import { baseSchema } from './base';

export const apiSchema = baseSchema.extend({
  // No schema default — Railway injects a distinct PORT per deployed
  // service (api vs. worker), so a single hardcoded default here would be
  // wrong for one of them. Each entrypoint supplies its own local-dev
  // fallback (services/api/src/index.ts, services/api/src/worker.ts).
  PORT: z.coerce.number().int().positive().optional(),
  // Local-dev-only override so `pnpm dev` (index.ts) and `pnpm dev:worker`
  // (worker.ts) can run side by side without fighting over one shared PORT
  // value from a single .env file. Unset in Railway, where each deployed
  // service already gets its own distinct PORT injected by the platform.
  WORKER_PORT: z.coerce.number().int().positive().optional(),
  API_URL: z.url().default('http://localhost:4040'),
  CAREER_URL: z.url().default('http://localhost:4451'),
  WEB_URL: z.url().default('http://localhost:4445'),
  FINANCE_URL: z.url().default('http://localhost:4444'),
  // ponti-studios/labs — a separate repo/deploy target (labs.ponti.io in
  // prod), not one of this monorepo's own apps. Trusted so its Realitea
  // game can use the shared hosted /login page's app-redirect mode.
  LABS_URL: z.url().default('http://localhost:3001'),
  // labs also serves the same app at the apex domain (ponti.io) alongside
  // labs.ponti.io — optional second trusted origin for that redirect target.
  LABS_APEX_URL: z.url().optional(),
  DATABASE_URL: z.url(),
  // No default — a missing secret must fail loudly at boot, not silently run
  // with a hardcoded, publicly-known value.
  BETTER_AUTH_SECRET: z.string().min(32),
  AUTH_COOKIE_DOMAIN: z.string().default(''),
  // z.coerce.boolean() is `Boolean(value)` under the hood, so Boolean("false")
  // is `true` — any non-empty string is truthy. z.stringbool() parses the
  // literal string correctly instead.
  AUTH_E2E_ENABLED: z.stringbool().default(false),
  AUTH_E2E_SECRET: z.string().default(''),
  AUTH_TEST_OTP_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  AUTH_EMAIL_OTP_EXPIRES_SECONDS: z.coerce.number().int().positive().default(300),
  RESEND_API_KEY: z.string(),
  RESEND_FROM_EMAIL: z.string(),
  RESEND_FROM_NAME: z.string(),
  SEND_EMAILS: z
    .enum(['true', 'false'])
    .default('false')
    .describe('Whether to actually send emails via Resend'),
  OPENROUTER_API_KEY: z.string(),
  SENTRY_DSN: z.string().optional(),
  OPENAI_APPS_CHALLENGE: z.string().optional(),
  SAVE_VOICE_AUDIO: z.stringbool().default(false),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.url().optional(),
  OTEL_EXPORTER_OTLP_PROTOCOL: z.string().optional(),
  OTEL_TRACES_SAMPLER_ARG: z.coerce.number().default(1.0),
  PLAID_CLIENT_ID: z.string().default(''),
  PLAID_API_KEY: z.string().default(''),
  PLAID_ENV: z.enum(['sandbox', 'development', 'production']).default('sandbox'),
});

export type ApiEnv = z.infer<typeof apiSchema>;
