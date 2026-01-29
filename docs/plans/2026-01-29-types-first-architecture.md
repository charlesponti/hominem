---
title: Types-First Architecture
date: 2026-01-29
status: planned
category: architecture
priority: high
estimated_effort: 3d
---

Executive summary
- Move to explicit, centralized domain types so TypeScript computes each type once. This reduces repeated inference (`typeof app`) and enables sub-second type-checking across apps.

Problem statement
- `typeof app` and deep route inference cause repeated, expensive type computation across apps; current per-app checks are 0.2s–17s depending on app.

Implementation phases
- Phase 1: extract domain types (places, finance, invites, etc.) into `packages/hono-rpc/src/types/*.types.ts` (2–8h per domain)
- Phase 2: refactor routes to import explicit types and validators (1–3 days)
- Phase 3: update apps & clients to consume explicit types (1–2 days)
- Phase 4: cleanup deprecated `AppType` usage and remove inference-heavy artifacts (1 day)

Checklist & verification
- [ ] For each domain, `types/*.types.ts` exists and exports input/output types
- [ ] Apps import domain types directly (no `AppType` inference)
- [ ] `bun run type-audit` shows per-app type-check <1s
- [ ] `bun run test` passes after migration

Commands
```bash
# Run type-audit to measure instantiations
bun run analyze:type-perf

# Per-app typecheck
bun run -C apps/rocco typecheck || bun --typecheck -C apps/rocco
```

Notes
- Migration is incremental and backward-compatible: keep `AppType` exports until all consumers migrate.
- Prioritize high-impact domains (finance, places) first.

Related
- PERFORMANCE_ROADMAP.md
- HONO_RPC_IMPLEMENTATION.md
