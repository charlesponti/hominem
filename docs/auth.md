# II. Authentication

Better Auth is the sole authority for sessions. Preserve its session database, signed cookies, and native client-storage contract.

- **Omiro** — Persists and forwards the Better Auth session cookie.
- **Finance** — Uses browser session credentials and cookies.
- **Career** — Forwards the incoming request cookie for server-side API calls.
- **MCP** — Uses OAuth bearer access tokens with its own scopes, budgets, and rate limits.

MCP OAuth bearer tokens and Better Auth sessions are different protocols. Web and mobile API traffic uses Better Auth session cookies; `/api/mcp` accepts only MCP OAuth bearer access tokens carrying `career:read`.

## MCP browser authorization

The API owns the MCP OAuth browser flow. Better Auth discovery, authorization, token issuance, and the API-hosted `/login` page all run on the API origin. The `/login` page is Hono server-rendered JSX and submits OTP actions to Better Auth's native endpoints; it does not create a separate session, token, or refresh mechanism. After Better Auth establishes the session cookie, the page resumes the same `/api/auth/mcp/authorize` request. Career is not an MCP OAuth login dependency.

When MCP scopes change, reconnect the local client so it requests a new authorization grant:

```bash
codex mcp logout hominem
codex mcp login hominem
```
