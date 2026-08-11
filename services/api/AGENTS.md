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

## Production authentication

- Better Auth is the sole authentication authority. Preserve its session database, signed cookies, and native client storage contract.
- Do not add custom token or session storage when the Better Auth surface already exists.
- The test OTP store is enabled by `NODE_ENV !== 'production'`. A duplicate env-var gate is unnecessary and harmful. When enabled, the API records OTPs in the test store and returns success without sending through Resend.
- A `200` response from the OTP request endpoint does not prove delivery. Check the email provider path without logging OTPs, tokens, cookies, or credentials.
- Never rotate `BETTER_AUTH_SECRET` casually. Better Auth signs session cookies with it; changing it can invalidate every stored client session even when the database session rows still exist.
- When investigating a production auth incident, check the API deployment status, `/api/status`, auth HTTP status patterns, the presence of the OTP flag, and aggregate session counts/expiry through an approved Railway database tunnel. Do not retrieve session tokens or user records.
