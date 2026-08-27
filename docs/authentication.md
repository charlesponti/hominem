# II. Authentication

Better Auth, running inside the API, is the sole authority for sessions. Keep
its session database, signed cookies, and native client-storage contract —
no application creates, translates, or stores its own end-user credential.

- **Omiro** — Persists and forwards the Better Auth session cookie.
- **Career, Finance, Notes (`apps/web`)** — Unauthenticated browsers redirect
  to the API-hosted `/login`; server-side session and data calls use the
  required private API URL.
- **WH?T** (`what.`) — Uses the same hosted login and session cookie through
  its own subdomain.
- **MCP** — Uses OAuth bearer access tokens with its own scopes, budgets, and
  rate limits — a different protocol from Better Auth session cookies (see
  below).

## How it works

Development and production run the identical mechanism. The only difference
is which env values point the apps and the cookie at `localhost` versus the
production domain; there is no separate dev auth code path.
`getAdvancedOptions()` in
[services/api/src/auth/better-auth.ts](../services/api/src/auth/better-auth.ts)
derives every cookie attribute from env config:

- `useSecureCookies` is `true` when `NODE_ENV === 'production'` **or** the
  API's own URL is `https:` — so a local API served over plain `http:` gets
  `Secure: false`, and everything else gets `Secure: true`.
- Cross-subdomain cookies (`Domain=<AUTH_COOKIE_DOMAIN>`) only turn on when
  `AUTH_COOKIE_DOMAIN` is non-empty. Production sets it to the shared parent
  domain, so one cookie is valid across Career, Finance, and the API's own
  origin. Local development typically leaves it unset, so the cookie is
  scoped to whichever single origin issued it — session sharing across
  `localhost` ports isn't needed because each app talks to the same local API
  directly.
- `sameSite: 'lax'` and `httpOnly: true` are constant in both environments.

## How the apps talk to the API

Every deployed web app needs two different API URLs, because they're used by
two different callers with two different trust boundaries:

| Caller | Env var | Purpose |
| --- | --- | --- |
| Browser | `VITE_PUBLIC_API_URL` | Hosted login redirects, public API calls, Better Auth's browser client |
| App server | `HOMINEM_INTERNAL_API_URL` | Session resolution and server-side Hono/RPC data calls |
| App server | `PUBLIC_APP_URL` | The app's own public origin, used to build hosted-login return URLs |

`HOMINEM_INTERNAL_API_URL` is server-only in both environments — never expose
it as a `VITE_*` variable or use it in a browser redirect, client request, or
auth client configuration. In production it must resolve to the API service's
private Railway address; in development it's the same local API URL as
`VITE_PUBLIC_API_URL`, since there's no private/public split on localhost. The
actual values live in each app's Railway service variables (production) and
`.env.example` (development) — not here, so this doc can't drift from them.

This split exists because the public API is Cloudflare-protected in
production. A browser can complete Cloudflare's challenge; a Railway
server-to-server request cannot. If an app's server sends its session check to
the public URL instead of the private one, Cloudflare can return an edge
response instead of Better Auth's session payload. `getServerAuth` fails
closed to no user, so the visible symptom is a successful OTP sign-in
immediately followed by a redirect back to the sign-in page. Locally this
failure mode doesn't exist — both URLs point at the same unprotected API — but
apps must still read the two env vars separately so the same code path works
in both environments without a special case.

Never fall back from `HOMINEM_INTERNAL_API_URL` to `VITE_PUBLIC_API_URL`. A
missing value should stop the app, not silently route SSR session checks
through Cloudflare.

## Cookie contract

The browser sends its session cookie to whichever app origin it's visiting.
That app's server reads the inbound `Cookie` header and forwards it unchanged
to the private API session endpoint, then forwards every returned `Set-Cookie`
header back to the browser unmodified — never collapse multiple `Set-Cookie`
headers with `headers.get('set-cookie')`. Apps must not read, log, combine, or
persist cookie values — they are a pass-through, not a store.

Production cookies carry a cross-subdomain `Domain`, `Secure`, `HttpOnly`,
`SameSite=Lax`. Development cookies carry the same `HttpOnly`/`SameSite=Lax`
pair, scoped to a single local origin, without `Secure` (plain `http:`).
Browser sessions additionally use Better Auth's short-lived signed cookie
cache (five minutes).

Each deployed or locally-run app needs `VITE_PUBLIC_API_URL`,
`HOMINEM_INTERNAL_API_URL`, and `PUBLIC_APP_URL` set — see that app's
`.env.example` for the development values and its Railway service variables
for production. `HOMINEM_INTERNAL_API_URL` is required in every environment;
set it explicitly rather than relying on a default, so the no-fallback rule
above stays enforceable by inspection.

## Login flow

The app entry points `/auth` and `/login` are compatibility shims, not real
auth screens. They build a trusted absolute return URL from `PUBLIC_APP_URL`
and redirect to the API's hosted login (`<API URL>/login?next=...`). The API
validates the return origin against its trusted origins
(`getTrustedOrigins()` in `better-auth.ts`) before redirecting back after OTP
verification. First-party web apps do not host duplicate OTP screens or
maintain app-owned auth state — apps must not add custom tokens, localStorage
auth, or duplicate OTP state. The hosted login and the forwarded cookie are
the only credential surface.

## Session and OTP rules

- Better Auth stores OTP rate-limit state in its database-backed `rateLimit`
  table so limits survive restarts and apply across API instances.
- The test OTP store is enabled when `NODE_ENV !== 'production'`. Do not add
  another environment-variable switch for it.
- Do not rotate `BETTER_AUTH_SECRET` casually. It signs live session cookies.

## MCP OAuth

Web and mobile API requests use Better Auth session cookies. `/api/mcp`
accepts MCP OAuth bearer tokens instead, scoped per tool — career reads
require `career:read`, career mutations require `career:write`, and so on for
each tool's own scopes, budgets, and rate limits.

The API owns the MCP OAuth 2.1 browser flow. Better Auth discovery,
`/api/auth/oauth2/*` authorization/token/registration endpoints, and the
API-hosted `/login` and `/consent` pages all run on the API origin. CIMD is
preferred; unauthenticated Dynamic Client Registration remains temporarily
enabled for Raycast compatibility. The `/login` page is server-rendered Hono
JSX and sends OTP actions to Better Auth's native endpoints. Consent is a
separate explicit approval step and does not create another session, token,
or refresh mechanism. After Better Auth sets the session cookie, the page
resumes the same `/api/auth/oauth2/authorize` request. Career is not required
for MCP OAuth login.

When MCP scopes change, reconnect the local client so it requests a new
grant:

```bash
codex mcp logout hominem
codex mcp login hominem
```

## Production incident investigation

- A successful OTP request does not prove that the email was delivered. Check
  the deployment, `/api/status`, aggregate HTTP patterns, and the email
  provider path. Do not log OTPs or tokens.
- During a production investigation, use only aggregate session counts and
  expiry data through an approved database tunnel. Never retrieve user
  records, session tokens, cookies, OTPs, or credentials.

## Verifying a change

After changing auth configuration or deployment topology, run the
`hominem-auth-production-verify` skill
(`.agents/skills/hominem-auth-production-verify/`) — its checklist covers both
environments' login redirect, cookie issuance, and session-resolution
verification steps.
