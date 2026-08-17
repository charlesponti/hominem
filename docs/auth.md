# II. Authentication

Better Auth is the only authority for sessions. Keep its session database, signed cookies, and native client-storage contract.

- **Omiro** — Persists and forwards the Better Auth session cookie.
- **Career and Finance** — Unauthenticated browsers redirect to the API-hosted `/login`; server-side session and data calls use the required private Railway API URL.
- **MCP** — Uses OAuth bearer access tokens with its own scopes, budgets, and rate limits.

MCP OAuth bearer tokens and Better Auth sessions are different protocols. Web and mobile API requests use Better Auth session cookies. `/api/mcp` accepts MCP OAuth bearer tokens with the scopes required by each tool; career reads require `career:read` and career mutations require `career:write`.

## Session and OTP rules

- First-party web apps do not host duplicate OTP screens or maintain app-owned auth state. Better Auth session cookies remain the only web credential, and app `/auth` routes are compatibility redirects to the API hosted login.
- Browser traffic uses `VITE_PUBLIC_API_URL`; server-side auth and Hono/RPC data calls use required `HOMINEM_INTERNAL_API_URL`. Hosted-login return URLs use the explicit public app origin in `PUBLIC_APP_URL`. Never fall back from the private URL to the public URL.

- Browser sessions use Better Auth's short-lived signed cookie cache (five minutes). All web server boundaries must forward every `Set-Cookie` header returned by Better Auth; never collapse them with `headers.get('set-cookie')`.
- Better Auth stores OTP rate-limit state in its database-backed `rateLimit` table so limits survive restarts and apply across API instances.
- The test OTP store is enabled when `NODE_ENV !== 'production'`. Do not add another environment-variable switch for it.
- Do not rotate `BETTER_AUTH_SECRET` casually. It signs live session cookies.

## Production incident investigation

- A successful OTP request does not prove that the email was delivered. Check the deployment, `/api/status`, aggregate HTTP patterns, and the email provider path. Do not log OTPs or tokens.
- During a production investigation, use only aggregate session counts and expiry data through an approved database tunnel. Never retrieve user records, session tokens, cookies, OTPs, or credentials.

## MCP browser authorization

The API owns the MCP OAuth 2.1 browser flow. Better Auth discovery, `/api/auth/oauth2/*` authorization/token/registration endpoints, and the API-hosted `/login` and `/consent` pages all run on the API origin. CIMD is preferred; unauthenticated Dynamic Client Registration remains temporarily enabled for Raycast compatibility. The `/login` page is server-rendered Hono JSX and sends OTP actions to Better Auth's native endpoints. Consent is a separate explicit approval step and does not create another session, token, or refresh mechanism. After Better Auth sets the session cookie, the page resumes the same `/api/auth/oauth2/authorize` request. Career is not required for MCP OAuth login.

When MCP scopes change, reconnect the local client so it requests a new grant:

```bash
codex mcp logout hominem
codex mcp login hominem
```
