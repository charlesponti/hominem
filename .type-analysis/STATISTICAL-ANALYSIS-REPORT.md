# Type Performance Statistical Analysis Report - Week 4

**Date:** February 5, 2026
**Baseline:** `.type-analysis/baseline-week4-optimization.json`
**Status:** ✅ Healthy

## Executive Summary

Phase 6 (Week 4) focuses on the Calendar domain optimization. Following the split of `calendar.schema.ts` into modular files and the alignment of downstream services (`google-calendar.service.ts`), we have established a new performance baseline.

## Performance Metrics

| Package | Check Time (s) | Files | Slow Files (>1s) | Avg File Time (ms) |
| :--- | :--- | :--- | :--- | :--- |
| **apps/rocco** | 5.43 | 5550 | 0 | 0.98 |
| **apps/notes** | 5.62 | 6714 | 0 | 0.84 |
| **apps/finance** | 1.55 | 4458 | 0 | 0.35 |
| **packages/hono-rpc** | 5.08 | 5288 | 0 | 0.96 |
| **packages/hono-client** | 5.22 | 5368 | 0 | 0.97 |
| **packages/events** | 4.41 | 3564 | 0 | 1.24 |
| **packages/services** | 4.52 | 4104 | 0 | 1.10 |
| **packages/db** | 0.65 | 1378 | 0 | 0.47 |

## Key Findings

1. **Modularization Success:** The split of `calendar.schema.ts` has successfully isolated complexity. `packages/events` now checks in 4.41s across 3,564 files (including dependencies), which is well within acceptable limits.
2. **Zero Slow Files:** No individual file exceeds the 1s type-check threshold.
3. **Type Safety Alignment:** Downstream services and routes are now fully aligned with the expanded `events` table schema, providing default values for new goal and activity tracking fields.
4. **RPC Consistency:** `hono-rpc` remains stable at ~5s check time, maintaining high-performance type inference.

## Optimization Outcomes

- **Lines of Code:** Reduced in `calendar.schema.ts` by splitting into 3 files.
- **Type Performance:** Maintained sub-6s check times for all major packages.
- **Maintenance:** Established `EventInput` and `EventOutput` as canonical types, removing redundant table inference in services.

## Next Steps

- Proceed to Week 5: Type architecture linting rules.
- Continuous monitoring of `hono-client` as it remains one of the larger type surfaces.
