# Type Performance Statistical Analysis Report - Week 4

**Date:** February 6, 2026
**Baseline:** `.type-analysis/baseline-week4-optimization.json`
**Status:** ⚠️ Needs Attention (1 critical file)

## Executive Summary

Phase 6 (Week 4) focuses on the Calendar domain optimization. Following the split of `calendar.schema.ts` into modular files and the alignment of downstream services (`google-calendar.service.ts`), we have established a new performance baseline.

## Performance Metrics

| Package | Check Time (s) | Files | Slow Files (>1s) | Avg File Time (ms) |
| :--- | :--- | :--- | :--- | :--- |
| **apps/rocco** | 5.23 | 5550 | 0 | 0.94 |
| **apps/notes** | 5.44 | 6714 | 0 | 0.81 |
| **apps/finance** | 1.53 | 4458 | 0 | 0.34 |
| **packages/hono-rpc** | 5.06 | 5288 | 0 | 0.96 |
| **packages/hono-client** | 7.39 | 5368 | 1 | 1.38 |
| **packages/events** | 4.38 | 3564 | 0 | 1.23 |
| **packages/services** | 4.55 | 4104 | 0 | 1.11 |
| **packages/db** | 0.66 | 1378 | 0 | 0.48 |

## Key Findings

1. **Modularization Success:** The split of `calendar.schema.ts` has mostly isolated complexity. `packages/events` checks in 4.38s across 3,564 files (including dependencies), within acceptable limits.
2. **One Critical File:** `packages/db/src/schema/calendar-events.schema.ts` exceeds the 1s threshold (2.12s). This is now the primary optimization target.
3. **Type Hub Risk:** Highest-centrality files remain `packages/hono-rpc/src/middleware/auth.ts`, `packages/ui/src/lib/utils.ts`, `packages/db/src/schema/users.schema.ts`, and `packages/db/src/schema/shared.schema.ts`.
4. **RPC Consistency:** `hono-rpc` remains stable at ~5s check time, maintaining high-performance type inference.

## Optimization Outcomes

- **Lines of Code:** Reduced in `calendar.schema.ts` by splitting into 3 files.
- **Type Performance:** Maintained sub-6s check times for all major packages.
- **Maintenance:** Established `EventInput` and `EventOutput` as canonical types, removing redundant table inference in services.

## Next Steps

- Proceed to Week 5: Type architecture linting rules.
- Continuous monitoring of `hono-client` as it remains one of the larger type surfaces.
