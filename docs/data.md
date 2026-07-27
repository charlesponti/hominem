# II. Data

## Data and contract law

- External boundaries validate at runtime. Typed client code still parses API responses before mutating application state.

- Database access, repositories, schema, and transactions have one owner: `@hominem/db` and the server-owned code that uses it.

- Generated database types are checked artifacts. Generate them through `just db codegen`; CI rejects drift.

- Omiro's database is authoritative for tasks and their scheduling intent. Apple Calendar and Reminders are device integrations represented as external projections; their identifiers and synchronization state do not replace the canonical task record.

- All tests must use the test database.

## Open system decisions

- **Public transport contract ownership** — Clients no longer depend on the deployable API package for runtime or type ownership.
- **Career data model** — One documented server/DB or API-backed model; database imports stay in its permitted layer.
- **Finance release tier** — README, CI, deployment configuration, and command scopes agree.
- **Better Auth bearer sessions** — Keep or remove the plugin with a tested external compatibility contract.

