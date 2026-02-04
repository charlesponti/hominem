---
title: Performance Roadmap: Path to Sub-Second Type Checking
date: 2026-01-29
status: planned
category: performance
priority: high
estimated_effort: 1w
---

Executive summary
- Goal: achieve <1s TypeScript type-check time and <100MB memory for core apps.
- Short path: quick config wins → architectural changes (types-first, Hono RPC) → nuclear options (deprecate legacy RPC / SWC).

Problem statement
- Type inference across monorepo causes massive type-instantiations and memory use. Current checks: ~6s–18s per app.

Phases & high level tasks
- Phase 1 (30–120m): quick wins
  - enable `skipLibCheck`, use Bun's native type checker, incremental tsconfig, exclude tests from dev checks
  - add package-level `typecheck` and `typecheck:ci` scripts
- Phase 2 (2h–3d): architecture
  - adopt types-first: centralize explicit domain types in `packages/hono-rpc/src/types`
  - split large router packages and enable lazy-loading of routers
  - create minimal type-only packages where appropriate
- Phase 3 (3–10d): nuclear (if needed)
  - replace legacy RPC usage with Hono RPC route-by-route
  - adopt SWC for dev transpilation, keep type-check in CI

Quick commands
```bash
# Test Bun type checker
cd packages/*legacy-rpc* || true
time bun run --bun tsc --noEmit

# Run project incremental typecheck (dev)
bun run typecheck

# Full CI check
npm run -w packages/*legacy-rpc* typecheck:ci
```

Verification checklist
- [ ] `bun run typecheck` first/second runs show expected improvement (first run reduced, second run <1s with incremental)
- [ ] Verify there are no legacy RPC package references after migration (when complete)
- [ ] CI `typecheck:ci` completes without errors
- [ ] Memory profile: peak compilation memory <100MB for targeted apps

Related docs
- HONO_RPC_IMPLEMENTATION.md → .github/instructions/hono-rpc.implementation.instructions.md
- TYPES_FIRST_ARCHITECTURE.md → docs/plans/2026-01-29-types-first-architecture.md
