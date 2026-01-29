---
applyTo: '**'
---

# Performance-First (Concise)

Goal: Build fast local iteration, fast type-checks, and efficient production runtime with minimal cognitive overhead.

Core Principles

- Keep type-checks cheap: prefer `import type` for type-only imports; avoid deep recursive and highly generic types that cause expensive inference.
- Keep builds lean: prefer simple dependency graphs, avoid large transitive dependencies for small features, and respect the internal packages pattern.
- Make runtime efficient: cache where appropriate, aggregate heavy work server-side, and prefer indexed DB queries and pagination for large result sets.

Practical Rules

- Use `import type` when only types are needed.
- Limit complex generic chains — extract into named helper types when necessary.
- Configure `tsconfig` for fast dev: `skipLibCheck: true`, `incremental: true`.
- Measure, don’t guess: add lightweight telemetry and run `bun --typecheck`, `bun run analyze:type-perf`, and Lighthouse checks in CI.

Database & Caching

- Aggregate and page on the server; avoid large initial payloads.
- Use Redis/HTTP caches for expensive responses and set clear TTLs and invalidation rules.

CI & Checks

- Run `bun run format`, `bun run lint --parallel`, `bun run test`, and `bun run typecheck` in CI.
- Add a perf audit to PR checklist if the change touches critical paths (DB queries, high-frequency endpoints, rendering hot paths).

Keep it simple: if guidance is longer than one screen, move examples to `docs/` and keep this file a short checklist.