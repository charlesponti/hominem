# II. Authentication

Better Auth is the only authority for sessions. Keep its session database, signed cookies, and native client-storage contract.

- **Omiro** — Persists and forwards the Better Auth session cookie.
- **Finance** — Uses browser session credentials and cookies.
- **Career** — Forwards the incoming request cookie for server-side API calls.
- **MCP** — Uses OAuth bearer access tokens with its own scopes, budgets, and rate limits.

MCP OAuth bearer tokens and Better Auth sessions are different protocols. Web and mobile API requests use Better Auth session cookies. `/api/mcp` accepts MCP OAuth bearer tokens with the scopes required by each tool; career reads require `career:read` and career mutations require `career:write`.

## Session and OTP rules

- The test OTP store is enabled when `NODE_ENV !== 'production'`. Do not add another environment-variable switch for it.
- Do not rotate `BETTER_AUTH_SECRET` casually. It signs live session cookies.

## Production incident investigation

- A successful OTP request does not prove that the email was delivered. Check the deployment, `/api/status`, aggregate HTTP patterns, and the email provider path. Do not log OTPs or tokens.
- During a production investigation, use only aggregate session counts and expiry data through an approved database tunnel. Never retrieve user records, session tokens, cookies, OTPs, or credentials.

## MCP browser authorization

The API owns the MCP OAuth browser flow. Better Auth discovery, authorization, token issuance, and the API-hosted `/login` page all run on the API origin. The `/login` page is server-rendered Hono JSX and sends OTP actions to Better Auth's native endpoints. It does not create another session, token, or refresh mechanism. After Better Auth sets the session cookie, the page continues the same `/api/auth/mcp/authorize` request. Career is not required for MCP OAuth login.

When MCP scopes change, reconnect the local client so it requests a new grant:

```bash
codex mcp logout hominem
codex mcp login hominem
```
