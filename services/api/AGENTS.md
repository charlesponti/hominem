# API agent instructions

Scoped to `services/api`. The root [AGENTS.md](../../AGENTS.md) is the primary
instruction authority; this file adds API-specific detail and must not
duplicate or contradict it.

## Implementation rules

`services/api` is a Hono HTTP server and BullMQ worker. Its entry points are `src/index.ts` for HTTP and `src/worker.ts` for jobs.

- `AppEnv` in `src/server.ts` declares Hono's context variable map. Auth middleware sets `ctx.var.user`, `ctx.var.userId`, and `ctx.var.auth`; route handlers read those values and do not re-fetch the user.
- A route lives in `src/routes/<name>.ts` as a `Hono<AppEnv>` instance and is registered from `src/server.ts` with `app.route('/path', myRoutes)`. Apply `authJwtMiddleware` only when its route-specific protection is needed.
- `src/rpc/app.ts` is the type-safe RPC contract consumed by clients through `@hominem/api/types`. Update affected clients in the same change as an RPC contract change.
- Use `isServiceError` from `src/errors.ts` for known domain failures. Throw typed errors and let the global handler map them to HTTP responses.
- Job handlers live in `src/workers/` and register in `src/worker.ts`. The worker is a separate process and shares no HTTP-server memory.
- From `services/api`, build with `node build.mjs`; standard Turbo build is not its build path. Use `pnpm test --filter=@hominem/api...` and `pnpm --filter @hominem/api dev` for its normal lanes.
- `public/login.css`/`public/login.js` (the hosted login page) are served as static files, not compiled from `pages.tsx`/`browser.ts` at request time. `login.js` is specifically a **committed build artifact** bundled from `src/routes/login/browser.ts` via rolldown (`scripts/login-client-bundle.mjs`) — `pnpm dev`'s `scripts/dev.mjs` rebuilds it live via `rolldown.watch()` alongside `tsx watch`, so local dev picks up `browser.ts` edits automatically. Outside that dev loop (e.g. a one-off build), run `node build.mjs` and commit the regenerated `public/login.js` — a source-only change to `browser.ts` without the rebuilt artifact ships stale client behavior with no error anywhere.

## Career domain

- `app.career_applications.status` is `NOT NULL` with no column default, and a constraint trigger (`20260810150000_normalize_career_application_pipeline.sql`) rejects any status other than `WISHLIST`, `ACCEPTED`, `REJECTED`, or `WITHDRAWN` unless the application already has a matching active pipeline stage (`APPLIED` needs an `APPLICATION`-kind stage, `SCREENING` needs `SCREEN`, `OFFER` needs `OFFER`). A stage-less create must default to `status: 'WISHLIST'` — see `createCareerApplication` in `src/application/career.service.ts`. Any test or script inserting directly into `app.career_applications` needs an explicit `status` for the same reason.
- MCP tools and RPC routes for a resource are thin adapters over one `src/application/<domain>.service.ts` implementation and one set of `src/schemas/<domain>.schema.ts` Zod schemas — never fork query logic or validation between the two surfaces. Follow the `hominem-resource` skill when adding or reviewing a resource.

## Production authentication

- Better Auth is the sole authentication authority. Preserve its session database, signed cookies, and native client storage contract.
- Do not add custom token or session storage when the Better Auth surface already exists.
- Email OTP delivery is scripted outside production: an explicit `HOMINEM_EMAIL_PROVIDER` wins, otherwise production sends via Resend and any other `NODE_ENV` captures outbound mail to the same-host scripted mailbox (`src/testkit/resend.mock.ts`, `@hominem/utils/scripted-mailbox`) instead of sending. Scripted boot is refused in production and the mailbox sink is additionally gated on non-production. OTPs are never retrievable over HTTP — E2E helpers read the mailbox file. Set `HOMINEM_EMAIL_PROVIDER=resend` explicitly to test real delivery locally.
- A `200` response from the OTP request endpoint does not prove delivery. Check the email provider path without logging OTPs, tokens, cookies, or credentials.
- Never rotate `BETTER_AUTH_SECRET` casually. Better Auth signs session cookies with it; changing it can invalidate every stored client session even when the database session rows still exist.
- When investigating a production auth incident, check the API deployment status, `/api/status`, auth HTTP status patterns, the active email provider (logged at boot), and aggregate session counts/expiry through an approved Railway database tunnel. Do not retrieve session tokens or user records.
