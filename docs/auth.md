# II. Authentication

Better Auth is the sole authority for sessions. Preserve its session database, signed cookies, and native client-storage contract.

- **Omiro** — Persists and forwards the Better Auth session cookie.
- **Finance** — Uses browser session credentials and cookies.
- **Career** — Forwards the incoming request cookie for server-side API calls.
- **MCP** — Uses OAuth bearer access tokens with its own scopes, budgets, and rate limits.

MCP OAuth bearer tokens and Better Auth bearer sessions are different protocols. Do not remove MCP bearer handling when changing Better Auth's `bearer()` plugin. That plugin stays until the external consumer contract is known; no first-party usage is not proof that no external client depends on it.

