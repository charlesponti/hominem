import { z } from 'zod';

import { baseSchema } from './base';

export const apiSchema = baseSchema.extend({
  // No default here on purpose — Railway hands each deployed service (api vs
  // worker) its own PORT, so a hardcoded fallback would be wrong for one of
  // them. Local-dev fallbacks live in each entrypoint instead
  // (services/api/src/index.ts, services/api/src/worker.ts).
  PORT: z.coerce.number().int().positive().optional(),
  // Lets `pnpm dev` and `pnpm dev:worker` run side by side locally without
  // both trying to use the same PORT from one .env file. Not needed on
  // Railway since each service already gets its own PORT there.
  WORKER_PORT: z.coerce.number().int().positive().optional(),
  API_URL: z.url().default('http://localhost:4040'),
  CAREER_URL: z.url().default('http://localhost:4451'),
  WEB_URL: z.url().default('http://localhost:4445'),
  FINANCE_URL: z.url().default('http://localhost:4444'),
  // labs (ponti-studios/labs, labs.ponti.io in prod) is a separate repo, not
  // one of this monorepo's apps. It's trusted so the Realitea game there can
  // use the shared hosted /login page's app-redirect mode.
  // Under portless (pnpm exec portless proxy start --port 4200 --tld lvh.me),
  // labyrinth runs at https://labyrinth.lvh.me:4200.
  LABS_URL: z.url().default('https://labyrinth.lvh.me:4200'),
  // labs also serves at the apex domain (ponti.io) alongside labs.ponti.io —
  // this is the optional second trusted origin for that redirect.
  LABS_APEX_URL: z.url().optional(),
  // WH?T is another separate game that uses the shared Hominem session
  // cookie and hosted login redirect. Under portless it runs at
  // https://what.lvh.me:4200.
  WHAT_URL: z.url().default('https://what.lvh.me:4200'),
  DATABASE_URL: z.url(),
  // No default on purpose — a missing secret should fail loudly at boot, not
  // silently fall back to a hardcoded value everyone can see in the repo.
  BETTER_AUTH_SECRET: z.string().min(32),
  AUTH_COOKIE_DOMAIN: z.string().default(''),
  // Where the scripted email provider appends captured OTPs as JSONL for
  // same-host E2E helpers (see @hominem/utils/scripted-mailbox). Empty means
  // the ~/.hominem default. Never an HTTP surface: OTPs are unreadable over
  // the API by design.
  HOMINEM_SCRIPTED_MAILBOX: z.string().default(''),
  AUTH_EMAIL_OTP_EXPIRES_SECONDS: z.coerce.number().int().positive().default(300),
  RESEND_API_KEY: z.string(),
  RESEND_FROM_EMAIL: z.string(),
  RESEND_FROM_NAME: z.string(),
  OPENROUTER_API_KEY: z.string(),
  SENTRY_DSN: z.string().optional(),
  OPENAI_APPS_CHALLENGE: z.string().optional(),
  SAVE_VOICE_AUDIO: z.stringbool().default(false),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.url().optional(),
  OTEL_EXPORTER_OTLP_PROTOCOL: z.string().optional(),
  OTEL_EXPORTER_OTLP_HEADERS: z.string().optional(),
  OTEL_TRACES_SAMPLER_ARG: z.coerce.number().default(1.0),
  PLAID_CLIENT_ID: z.string().default(''),
  PLAID_API_KEY: z.string().default(''),
  PLAID_ENV: z.enum(['sandbox', 'development', 'production']).default('sandbox'),
});

export type ApiEnv = z.infer<typeof apiSchema>;
