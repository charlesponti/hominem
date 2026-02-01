---
applyTo: '**'
---

# Performance-First (Checklist)

**Goal:** Fast local iteration, cheap type checks, and efficient production runtime.

Core rules

- Prefer `import type` and extract complex generic chains into named helper types to keep type-checks fast.
- Keep dependency graphs small; prefer focused packages over heavy transitive libraries.
- Measure: include quick type-perf checks and lightweight benchmarks (e.g., `bun --typecheck`, `bun run analyze:type-perf`) and surface results in CI.
- Runtime efficiency: cache strategically, paginate large requests, index frequently-read columns, and offload expensive work to background processes.

Quick checklist

- Run `bun --typecheck` and `bun run analyze:type-perf` locally and in CI for PRs touching critical paths. ✅
- Add a short perf note to PRs that change DB queries, render hot paths or background jobs. ✅
- Prefer measurement and lightweight benchmarks over speculative micro-optimizations. ✅

Database & Caching

- Aggregate and page on the server; avoid large initial payloads.
- Use Redis/HTTP caches for expensive responses and set clear TTLs and invalidation rules.

CI & Checks

- Run `bun run format`, `bun run lint --parallel`, `bun run test`, and `bun run typecheck` in CI.
- Add a perf audit to PR checklist if the change touches critical paths (DB queries, high-frequency endpoints, rendering hot paths).

Keep it simple: if guidance is longer than one screen, move examples to `docs/` and keep this file a short checklist.
