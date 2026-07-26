# II. System

Hominem is a monorepo because boundaries are shared decisions. The system
grows by making authority narrower and interfaces more explicit—not by adding
layers that merely rename imports.

## Authority map

```text
Omiro / web products
  -> transport and domain packages
  -> API
  -> database and infrastructure

API
  -> authentication authority
  -> authorization context
  -> persistence and orchestration
```

- Omiro is an RPC client. It does not reach into the database or recreate
  server authority locally.
- API resolves identity exactly once at the edge into canonical auth context.
  Route families authorize against that context; they do not perform a second
  session lookup.
- Career may use the database only from server-owned files. Browser code does
  not depend on the database.
- A deployable service is not automatically a client contract package. Runtime
  handlers and public transport contracts are separate responsibilities.
- Shared packages expose narrow, real boundaries. Root barrels stay small and
  must not become import-anything buckets.
- Type-only imports do not create workspace dependency edges. Use a local
  TypeScript path alias to the source contract instead.

## Authentication law

Better Auth is the sole authority for sessions. Preserve its session database,
signed cookies, and native client-storage contract.

| Surface | Session contract |
| --- | --- |
| Omiro | Persists and forwards the Better Auth session cookie. |
| Finance | Uses browser session credentials and cookies. |
| Career | Forwards the incoming request cookie for server-side API calls. |
| MCP | Uses OAuth bearer access tokens with its own scopes, budgets, and rate limits. |

MCP OAuth bearer tokens and Better Auth bearer sessions are different
protocols. Do not remove MCP bearer handling when changing Better Auth's
`bearer()` plugin. That plugin stays until the external consumer contract is
known; no first-party usage is not proof that no external client depends on it.

## Data and contract law

- External boundaries validate at runtime. Typed client code still parses API
  responses before mutating application state.
- Database access, repositories, schema, and transactions have one owner:
  `@hominem/db` and the server-owned code that uses it.
- Generated database types are checked artifacts. Generate them through
  `just db codegen`; CI rejects drift.
- Omiro's database is authoritative for tasks and their scheduling intent.
  Apple Calendar and Reminders are device integrations represented as external
  projections; their identifiers and synchronization state do not replace the
  canonical task record.
- Tests that can mutate data reject non-test databases at the database boundary,
  even when launched outside the normal command path.

## Open system decisions

| Decision | Exit condition |
| --- | --- |
| Public transport contract ownership | Clients no longer depend on the deployable API package for runtime or type ownership. |
| Career data model | One documented server/DB or API-backed model; database imports stay in its permitted layer. |
| Finance release tier | README, CI, deployment configuration, and command scopes agree. |
| Better Auth bearer sessions | Keep or remove the plugin with a tested external compatibility contract. |
