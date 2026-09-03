# 2026-09-03: omiro.ponti.io login loop, telemetry crash, and CI drift

## Summary

A single afternoon surfaced five distinct, mostly-unrelated bugs, discovered
in this order:

1. An infinite redirect loop between the hosted login page and
   `/api/auth/oauth2/authorize` when an OAuth client requests
   `prompt=login`/`max_age=0` — real, but **not** what the user was hitting.
2. The actual bug: visiting `https://omiro.ponti.io/` looped between the app
   and the hosted login page because `HOMINEM_INTERNAL_API_URL` on the `web`
   Railway service pointed at the public, Cloudflare-fronted API instead of
   the private Railway network.
3. Fixing #2 by pointing `HOMINEM_INTERNAL_API_URL` at
   `${{api.RAILWAY_PRIVATE_DOMAIN}}` failed validation because that reference
   resolves to a bare hostname, not a URL.
4. Fixing #3 by adding a scheme surfaced a fourth bug: `VITE_PUBLIC_API_URL`
   is baked into the client JS bundle at **build time**, so updating the
   Railway variable alone did nothing — and the resulting validation error
   crashed the entire app because it was thrown outside a try/catch.
5. Pushing the accumulated fixes revealed three **pre-existing, unrelated**
   CI failures that had been silently red since an earlier commit that never
   got a full CI run.

None of these had a single root cause. They are documented separately below
because the *mechanism* of each is the reusable lesson — grouping them under
one story would blur what to actually change going forward.

---

## Bug 1: OAuth `prompt=login` infinite loop (services/api)

### Symptom

Railway logs for the `api` service showed a tight loop of `GET /login → 302`
repeating dozens of times a second, triggered by an MCP OAuth client
(`codex-mcp-client`) completing sign-in in Safari.

### Mechanism

Better Auth's OAuth provider (`@better-auth/oauth-provider`, wrapped by
`@better-auth/mcp`) implements the OAuth 2.1 authorize endpoint. Its gate
logic (`authorizeEndpoint`, roughly):

```js
if (!session || (session && maxAgeSeconds !== undefined && !hasSatisfiedMaxAge)
    || promptSet?.has('login') || promptSet?.has('create')) {
  return redirectWithPromptCode(ctx, opts, 'login'); // → loginPage
}
```

This check runs on **every** hit to `/api/auth/oauth2/authorize`, with no
exemption for "the user just logged in a second ago." The exemption that
*does* exist — `isSessionFreshForSignedQuery(session.createdAt,
signedQueryIssuedAt)` — only lives inside the plugin's internal
`/oauth2/consent` and `/oauth2/continue` endpoints.

Our own [`/login/verify`](../../services/api/src/routes/login/route.tsx)
handler doesn't call either of those. After a successful OTP verification it
redirects straight back to `/api/auth/oauth2/authorize?<original query>` —
the *same, unmodified* query the client originally sent, `prompt=login` (or
`max_age=0`) included. So:

1. Client requests authorize with `prompt=login` → no session → redirect to
   `/login?<signed query>`.
2. User completes OTP → session created → `/login/verify` redirects back to
   `/api/auth/oauth2/authorize?<same signed query, prompt=login still set>`.
3. `authorizeEndpoint` sees `promptSet.has('login')` is true and redirects to
   `/login` again — **unconditionally**, regardless of the session that was
   just created.
4. `/login` sees the (now valid) session cookie and redirects to
   `/api/auth/oauth2/authorize` again. Back to step 3. Forever.

`max_age=0` produces the identical loop through a different check:
`isWithinMaxAge` has `if (maxAgeSeconds === 0) return false` hard-coded (per
OIDC spec, `max_age=0` means "always require fresh auth") — so it can never
be satisfied by re-hitting the same endpoint, no matter how fresh the
session actually is.

### Fix

[`resolvePostAuthResume`](../../services/api/src/routes/login/helpers.ts)
strips `prompt=login`/`prompt=create` and `max_age` from the query **after**
a successful sign-in, before resuming into `/oauth2/authorize` — mirroring
what the plugin's own `selected`/`created` continuation handlers do
internally via `removePromptFromQuery`. We're allowed to do this because we
*are* the party attesting the login just happened.

### Why this wasn't the omiro.ponti.io bug

This path is specific to the OAuth/MCP authorize flow — it's only reachable
when a `client_id`/`redirect_uri`/`response_type=code` query is present.
Visiting `https://omiro.ponti.io/` directly never touches
`/api/auth/oauth2/authorize` at all. This fix is real and worth keeping, but
diagnosing it first was a case of pattern-matching a similar-looking log
signature (repeated `GET /login → 302`) onto the wrong caller before asking
"which client is actually doing this?"

**Lesson:** when a log pattern repeats, identify the *client* (user agent,
IP, referer) before theorizing about the *server-side* mechanism. Two
completely different callers produced the same-looking log line here.

---

## Bug 2: omiro.ponti.io login loop (the real one) — Cloudflare vs. private network

### Symptom

Visiting `https://omiro.ponti.io/` in a browser: OTP sign-in succeeds, then
the browser bounces between the app and `api.ponti.io/login` forever.

### Mechanism

`omiro.ponti.io` is a custom domain on the `web` Railway service (it's
`apps/web`, not a separate deployment — there is no domain-specific branching
code for "omiro" anywhere in the app). Its auth flow:

- [`middleware.ts`](../../apps/web/app/lib/middleware.ts) —
  `requireAuthMiddleware` redirects to `hostedLoginUrl(path)` whenever
  `context.get(userContext)` is falsy.
- [`auth.server.ts`](../../apps/web/app/lib/auth.server.ts) resolves that
  context by calling the shared
  [`getServerAuth`](../../packages/auth/src/server.ts) against
  `serverEnv.HOMINEM_INTERNAL_API_URL` — a **server-to-server** fetch to
  Better Auth's `/api/auth/get-session`.

`getServerAuth` fails closed on *any* problem:

```js
try {
  response = await fetch(...);
} catch {
  return { user: null, headers: new Headers() };
}
if (!response.ok) {
  return { user: null, headers: new Headers() };
}
```

No logging, no distinction between "genuinely not logged in" (200, `user:
null`) and "couldn't talk to the real Better Auth" (network error, or a
non-200 from something that isn't Better Auth at all).

`api.ponti.io` sits behind Cloudflare in production (confirmed live —
Cloudflare's bot-management/challenge scripts load on every request to that
origin). A **server-to-server** request from Railway can't complete
Cloudflare's browser challenge the way a real browser can. So if
`HOMINEM_INTERNAL_API_URL` on the `web` service points at the public,
Cloudflare-fronted URL instead of the API's private Railway network address,
every SSR session check silently fails — even though the user's session
cookie is completely valid.

The loop:

1. Browser (with a valid session cookie) requests a protected page on
   `omiro.ponti.io`.
2. `web`'s server calls `HOMINEM_INTERNAL_API_URL/api/auth/get-session` →
   goes through Cloudflare → gets an edge response instead of Better Auth's
   JSON → `getServerAuth` returns `{ user: null }`.
3. `requireAuthMiddleware` treats the (validly authenticated!) request as
   unauthenticated → redirects to `hostedLoginUrl` (built correctly from the
   *public* `VITE_PUBLIC_API_URL`, since that's the browser-facing hop).
4. The API's `/login` route checks the session cookie directly (no
   Cloudflare in the way for its own internal `auth.api.getSession` call) →
   sees a valid session → redirects straight back to the app.
5. Back to step 2. Forever, without ever hitting a `/login/verify` or OTP
   step again after the first successful login.

This is a **documented, known failure mode** — [`docs/authentication.md`]
(../authentication.md) already names it explicitly ("the visible symptom is
a successful OTP sign-in immediately followed by a redirect back to the
sign-in page") — but the doc didn't stop it from happening, because nothing
*enforces* the correct value. `HOMINEM_INTERNAL_API_URL` is a Zod-validated,
required, `.default()`-free `z.url()` field, so a **missing** value would
crash the app at boot. A **syntactically valid but semantically wrong** value
(a real URL, just the wrong one) passes validation fine and fails silently at
runtime instead.

### Why local dev can't catch this

Every app's `.env.example` sets `HOMINEM_INTERNAL_API_URL` equal to
`VITE_PUBLIC_API_URL` (both `https://api.lvh.me:4200`) by design — there's no
public/private network split on localhost, so this class of bug is
**structurally unreachable** in local dev. It only exists where Cloudflare
(or any edge proxy) sits between a service and the public internet.

### Fix

Set `HOMINEM_INTERNAL_API_URL` on `web` (and any other app-serving service:
`career`, `finance`) to Railway's private-network reference:

```
http://${{api.RAILWAY_PRIVATE_DOMAIN}}:${{api.PORT}}
```

Two details that aren't obvious from Railway's UI:

- **Scheme required.** `${{api.RAILWAY_PRIVATE_DOMAIN}}` resolves to a bare
  hostname (`hominem-api-production.railway.internal`), and our schema
  validates with `z.url()`, which requires a protocol. This produced the
  immediate next error (`Invalid URL`) after the first attempted fix.
  Railway's private network is always plain HTTP — there's no TLS or
  Cloudflare on it, so it must be `http://`, never `https://`.
- **Port required, and it isn't 80/443.** Private networking connects
  directly to whatever port the target container is actually listening on.
  The `api` service's custom domain proxies to `targetPort: 8080` (Railway
  auto-assigns `PORT`; `services/api/src/index.ts` reads `env.PORT ?? 4040`),
  so the private URL needs `:${{api.PORT}}` (or the literal port) appended —
  `${{api.RAILWAY_PRIVATE_DOMAIN}}` alone silently connects to nothing.

### What would have caught this sooner

`getServerAuth` treating "couldn't reach the real Better Auth" identically to
"not logged in" is the actual design gap. A `!response.ok` on a
`get-session` call is a completely different situation from a `200` with
`session: null`, and collapsing them into the same `{ user: null }` return
value makes this failure mode invisible until a human notices the redirect
loop. **Not yet fixed** — see "Follow-ups" below.

---

## Bug 3: `VITE_PUBLIC_API_URL: Invalid input` — build-time vs. runtime env vars

### Symptom

After fixing Bug 2's variable, the app crashed on every page load with an
`EnvValidationError` for `VITE_PUBLIC_API_URL`, even though the Railway
variable was correctly set to `https://api.ponti.io`.

### Mechanism

`VITE_*`-prefixed variables are special: Vite statically replaces literal
`import.meta.env.VITE_*` references with string constants **at build time**,
baked directly into the shipped JS. This is fundamentally different from
`process.env` at runtime, which Node re-reads on every container start.

`apps/web/Dockerfile`:

```dockerfile
ARG VITE_PUBLIC_API_URL
ENV VITE_PUBLIC_API_URL=${VITE_PUBLIC_API_URL}
RUN test -n "$VITE_PUBLIC_API_URL"
...
RUN pnpm --filter @hominem/web run build
```

Setting the **runtime** Railway variable does nothing to a JS bundle that
was already built and pushed in an earlier image — that value only takes
effect on the *next full rebuild*, where Railway passes it as a Docker build
arg. Simply updating a variable and letting Railway redeploy the *existing*
image (or hitting a cached build layer) ships stale — or, in this case,
apparently blank — bytes regardless of what the dashboard says.

### Why the crash took down the whole app

The client-side validation itself
([`webClientSchema`](../../apps/web/app/lib/env.schema.ts)) is reasonable — it's a
required `z.url()` with no fallback, so a bad build-time value should fail
loudly. The actual bug was in **how** it failed:
[`use-telemetry.ts`](../../apps/web/app/lib/telemetry/use-telemetry.ts)
called `getClientEnv()` *outside* the `try/catch` that wrapped
`initTelemetry()`:

```js
const clientEnv = getClientEnv(); // throws here, uncaught
if (clientEnv.VITE_OTEL_EXPORTER_OTLP_ENDPOINT === 'none') return;
try {
  const telemetry = initTelemetry({ ...clientEnv });
  ...
} catch (error) { logger.error(...); }
```

`useTelemetry()` runs in a `useEffect` on every page, via `root.tsx`. React
treats an error thrown inside an effect the same as a render error for Error
Boundary purposes — so a telemetry-config problem took the *entire app* down
to the error boundary, not just telemetry.

### Fix

Two independent things, both necessary:

1. **Trigger a real rebuild** of the `web` service after setting/changing
   any `VITE_*` variable — a variable update + restart is not sufficient.
2. **Move `getClientEnv()` inside the `try/catch`**, so a client-env problem
   degrades telemetry instead of crashing the app. Telemetry should never be
   a hard dependency for the app to render.

**Lesson:** any `VITE_*` (or equivalent build-time-embedded) variable change
needs a rebuild, not a redeploy, and that distinction should be called out
explicitly wherever such variables are documented — it's easy to assume all
env vars work the same way Railway's dashboard implies they do.

---

## Bugs 4–6: three unrelated CI failures, surfaced by the first green-branch push in a while

Pushing the above fixes triggered the first full `validate-*` CI run against
`main` since an earlier, same-day commit (`feat(maestro): enhance Maestro
flow execution and authentication processes`) had landed — that commit
apparently never got a `validate-*` run of its own. Its diff had silently
broken three unrelated things that nobody had noticed yet.

**Lesson, general:** a commit that lands without a corresponding CI run is a
gap, not a pass. If a workflow's path filters, branch protection, or
something else lets a commit through without validation, that should be
treated as suspicious on its own, independent of what the commit actually
contains.

### Bug 4: `packages/db/src/types/database.ts` drift

**Mechanism:** this file is generated (`kysely-codegen`, introspecting a
fully-migrated Postgres instance) and checked in — CI enforces it stays in
sync via `just db codegen && git diff --exit-code`. The maestro commit hand-
edited this generated file directly (+82 lines), re-adding several finance
tables/columns (`financeAccountLabels`, `financeStatementPeriods`,
`financeTaxFilings`, `financeTaxFilingStatusEvents`, plus columns on
`financeAccounts`/`plaidItems`/`financeTransactions`) that two same-day
migrations (`20260903000000_drop_dead_finance_schema.sql`,
`20260903010000_drop_finance_accounts_balance_and_institution.sql`) had
already correctly dropped. The migrations themselves were fine — the
generated-types file was simply overwritten with a stale, pre-migration
snapshot, most likely from running codegen against a database that hadn't
had those migrations applied yet (a stale local dev DB, or a merge that
picked up an old file).

**A second-order mistake made while fixing this:** the first regeneration
attempt ran against a long-lived local `foundation-db-test` Docker container
(11+ hours of uptime) rather than a schema built from a clean migration
history. That container had *independently drifted* on two unrelated fields
(`AppCareerApplicationsOffers.applicationId` nullability, and the unused
`AppSocialThreadParticipants.ownerUserid` column) — not from bad migrations,
just from ad hoc local testing over time. That regeneration passed locally,
got committed and pushed, and CI immediately failed again with the *opposite*
diff.

**Fix, done twice:** spin up a genuinely fresh Postgres container, run every
migration from scratch via `just db migrate`, then regenerate. This matches
what CI always does (a brand-new service container per run) and is the only
way to be sure the generated file reflects *only* what's in the committed
`.sql` migrations — not whatever state a long-running local dev database
happens to be in today.

**Lesson:** never trust a long-lived local database for a "does this match
migrations" check. Either use a genuinely fresh container (as CI does) or
run the actual CI job locally via `act`/equivalent. A persistent local
Postgres is fine for day-to-day development; it is not a substitute for a
clean-migration-history source of truth.

### Bug 5: flaky `scripted-mailbox` test

**Mechanism:**
[`readLatestScriptedOtp`](../../packages/utils/src/scripted-mailbox.ts)
picks the "latest" OTP record by comparing `capturedAt` (an ISO timestamp,
millisecond resolution) with strict `>`. Three `appendScriptedMailboxRecord`
calls in a row in a fast test run can land within the same millisecond,
producing identical `capturedAt` values. On a tie, strict `>` keeps whichever
record was encountered *first* while scanning the file — not the one
actually written last — so the test intermittently got the first OTP
(`111111`) instead of the third (`333333`).

**Fix:** `>=` instead of `>`, so ties resolve to file/append order, which is
what "latest" is actually supposed to mean here.

**Lesson:** any "pick the latest by timestamp" comparison needs an explicit
tie-break when the timestamp's resolution is coarser than the rate at which
records can actually be produced. This is a general pattern, not specific to
this file — grep for other `record.capturedAt >`/`updatedAt >`-style
"latest wins" comparisons if this class of flake shows up again elsewhere.

### Bug 6: `@hominem/env`'s `ImportMeta.env` global augmentation conflict

**Mechanism:** [`packages/env/src/index.ts`](../../packages/env/src/index.ts)
declared:

```ts
declare global {
  interface ImportMeta {
    readonly env?: Record<string, string | boolean | undefined>;
  }
}
```

so a literal `import.meta.env` access would typecheck inside this package
without a hard dependency on `vite/client`'s ambient types. TypeScript merges
*all* declarations of a given global interface member across a program, and
requires them to have **identical modifiers and types**. Vite's own
`vite/client.d.ts` declares `readonly env: ImportMetaEnv` (required, a
specific named type) — incompatible with this package's `readonly env?:
Record<...>` (optional, a generic type) whenever both are visible in the same
TypeScript program.

CI's `validate-career` workflow runs `pnpm typecheck --filter=@hominem/career...`,
which (via the trailing `...`) also runs `@hominem/env`'s **own**, isolated
`tsc --noEmit` as a separate turbo task. In a fresh CI install, something in
that task's module resolution/hoisting made Vite's `vite/client` ambient
types visible to `@hominem/env`'s own typecheck, causing exactly this merge
conflict (`TS2687`/`TS2717`).

This was **not reproducible locally** at first — a long-lived local
`node_modules` already had `packages/env/build/*.d.ts` present from a prior
build, so consumers resolved the package's exported, pre-built types
(`"types": "./build/index.d.ts"` in `package.json#exports`) rather than
re-triggering the source-level ambient conflict. Only running `@hominem/env`'s
own isolated typecheck task exposed it — and even that didn't reproduce the
*exact* CI conditions (a plain local run of it passed too), because the
precise hoisting quirk that exposes `vite/client` there depends on the exact
fresh-install node_modules layout.

**Fix:** don't augment the global at all. Replaced the `declare global` block
with a local type assertion at the one call site that needs it
(`(import.meta as ImportMeta & { env?: EnvSource }).env`). This structurally
cannot participate in a global declaration merge conflict anymore, regardless
of what other ambient types happen to be visible in a given program — which
matters because we couldn't fully pin down *why* CI's install exposed the
conflict and a local reproduction didn't.

**Lesson:** global (`declare global`) type augmentations in a shared package
are a foot-gun whenever any consumer might independently declare an
overlapping global — and you cannot always predict or reproduce exactly when
two ambient declarations become simultaneously visible in a real build
pipeline's module resolution, especially with pnpm's node_modules layout
varying between long-lived local installs and fresh CI installs. Prefer a
local type assertion or a narrower technique (e.g. a type-only helper
function) over `declare global` for anything not genuinely meant to be a
project-wide ambient type.

---

## Consolidated guidance for future development

**Environment variables**

- A required env var with no default (`z.url()`, no `.default()`) protects
  against *missing* values, not *wrong-but-valid* ones. `HOMINEM_INTERNAL_API_URL`
  pointed at the wrong (but syntactically valid) host and passed validation
  fine. There is no code-level way to catch "right shape, wrong semantics" —
  this has to be caught by monitoring/alerting on the failure mode itself
  (see `getServerAuth` follow-up below), or by a deploy-time smoke test that
  actually exercises an authenticated SSR request against the freshly
  deployed service.
- `VITE_*` (build-time-embedded) variables and everything else (runtime env
  vars) have fundamentally different update semantics. Changing a `VITE_*`
  variable in Railway requires a full rebuild to take effect; changing a
  runtime var only requires a restart. When documenting or troubleshooting
  env vars, always note which category a given var falls into.
- Railway's private-network references (`${{service.RAILWAY_PRIVATE_DOMAIN}}`)
  resolve to a bare hostname with no scheme and connect on whatever port the
  target actually listens on (often not 80/443) — always compose the full
  URL explicitly: `http://${{service.RAILWAY_PRIVATE_DOMAIN}}:${{service.PORT}}`.

**Failing closed silently is worse than failing loudly**

- `getServerAuth` (`packages/auth/src/server.ts`) still returns identical
  `{ user: null }` for "genuinely not logged in" and "couldn't reach Better
  Auth at all." This is the single biggest lever to pull to catch the next
  version of Bug 2 automatically instead of via a user report. **Not yet
  fixed** — recommended follow-up: log a warning (with the response status
  or fetch error) whenever the non-200/network-error branch is hit, so this
  shows up in observability instead of only manifesting as a silent redirect
  loop.
- Any code that calls a validation/env-resolution function inside a
  `useEffect`, request handler, or other "should degrade gracefully" context
  should wrap that call in the same error boundary as the rest of the
  work it's used for — not call it unprotected right before the try/catch,
  as `use-telemetry.ts` did.

**Generated files (`database.ts`, and anything else `kysely-codegen`-like)**

- Never hand-edit a generated file. If it needs to change, change the
  migration and regenerate.
- Never regenerate against a long-lived local database — its state can
  silently drift from the true migration history through ordinary local
  development. Regenerate against a fresh container with migrations applied
  from scratch (exactly what CI's ephemeral service container does), or run
  the actual CI job locally.
- A commit that touches a generated file should be treated with extra
  suspicion if it doesn't also touch the source (migrations) that generates
  it — that's the signature of exactly this bug.

**CI hygiene**

- If a commit lands on `main` without a corresponding CI run completing
  (check `gh run list` for the commit's SHA), treat that as a gap needing
  investigation, not as an implicit pass. This is how three unrelated
  regressions sat undetected on `main` until an unrelated push happened to
  trigger the first full validation run.
- `declare global` augmentations in shared packages should be treated as
  high-risk: prefer a local type assertion or narrower typing technique
  unless the type genuinely needs to be ambient/project-wide.
- "Latest by timestamp" comparisons need an explicit, deliberate tie-break
  whenever the timestamp's resolution (here, milliseconds) is coarser than
  the rate at which records can be produced (here, three synchronous writes
  in a fast test).

---

## Follow-ups not yet done

- [ ] Add logging to `getServerAuth` distinguishing "no session" from
      "couldn't validate the session" (network error / non-200), so a
      misconfigured `HOMINEM_INTERNAL_API_URL` (or any future variant of the
      same failure) surfaces in observability instead of only as a redirect
      loop a user reports.
- [ ] Audit `career`'s and `finance`'s `HOMINEM_INTERNAL_API_URL` Railway
      variables for the same public-vs-private misconfiguration risk — this
      session only confirmed and fixed it for `web`.
- [ ] Route `apps/{web,career,finance}/app/lib/auth-client.ts`'s raw
      `import.meta.env.VITE_PUBLIC_API_URL` read through `createClientEnv`
      instead of bypassing validation (flagged during the env audit, not
      fixed — low severity, but inconsistent with the rest of the codebase's
      env-handling convention).
- [ ] Consider a deploy-time smoke test (hit a known-authenticated route
      right after a production deploy) that would catch Bug 2's failure mode
      automatically instead of waiting for a user to hit it.
