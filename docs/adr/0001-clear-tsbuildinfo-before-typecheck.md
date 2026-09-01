# ADR 0001: Clear each package's `.tsbuildinfo` before `typecheck`

## Status

Accepted (2026-08-31)

## Context

Every package under `packages/`, `apps/`, and `services/api` extends the shared `tsconfig.profiles/package.json`, which sets `composite: true` (and therefore `incremental: true`) with `tsBuildInfoFile: "./.cache/tsconfig.tsbuildinfo"`. `services/ori` and `services/deepeval` don't use this profile and were never in scope for this decision.

Each package's `typecheck` script runs plain `tsc --noEmit`. TypeScript's incremental engine persists per-file version signatures in that `.tsbuildinfo` file and, on a later invocation, reuses cached diagnostics for any file it believes is unchanged.

We hit a real failure of that assumption in this session. `packages/db/src/services/ai/ai-usage.repository.ts` and `packages/finance/src/test-utils.ts` had genuine type mismatches (a load-bearing kysely cast had been accidentally deleted, and an interface field was left as `unknown` instead of the real `Json` type). After fixing `packages/db`'s types, `pnpm -w typecheck` reported all 34 tasks passing — including `packages/ai`, which directly imports `@hominem/db` and had a real, unrelated type error in `packages/ai/src/ai-usage.ts` (`RecordAIUsageEventInput.metadata: Record<string, unknown>` is not assignable to `Json`). Turborepo correctly identified `@hominem/ai:typecheck` as a cache miss and re-invoked `tsc --noEmit` — but `tsc` itself consulted its own stale `.cache/tsconfig.tsbuildinfo` from a prior run and did not re-check `ai-usage.ts` against `@hominem/db`'s newly-rebuilt `build/index.d.ts`. Deleting `packages/ai/.cache` and re-running surfaced the real error immediately.

This means a `typecheck` gate — including `pnpm -w typecheck` used to validate this exact kind of cross-package change — could silently pass despite a genuine, unrelated type error introduced upstream. That's a correctness failure in a safety-critical check, not a cosmetic one.

We considered three options:

1. **Do nothing** — accept that `tsc`'s own incremental cache can silently mask cross-package type errors. Rejected: this is the bug we just hit, and it undermines the one thing `pnpm typecheck` exists to guarantee.
2. **A surgical fix** — hash each package's direct workspace dependencies' `build/**/*.d.ts` output and only clear `.cache` when that hash changes, preserving `tsc`'s incremental reuse for pure same-package edits. Rejected for now: real engineering effort, a new piece of cache-invalidation logic to get right and maintain, for a benefit bounded to a few packages (see below).
3. **Clear `.cache` before every `typecheck` invocation** — force `tsc` to fully re-check the package from a clean slate every time, so it can never trust a stale cross-package assumption. Chosen.

## Decision

Every affected package's `typecheck` script now runs `rm -rf .cache && tsc --noEmit` (or the equivalent with existing `-p`/`react-router typegen &&` prefixes/suffixes preserved). `build` scripts are untouched — they still use `composite`/`incremental` at full effect, since a stale build-time incremental cache doesn't produce the same silent-pass failure mode measured here (`build` outputs are still content-addressed and consumed by downstream `paths` overrides, and any real emit problem shows up as a build failure, not a quietly-wrong pass).

## Consequences

**Fixed:** `pnpm typecheck` (per-package or `pnpm -w typecheck`) can no longer report a false pass due to `tsc`'s own incremental cache missing a cross-package type change. Verified with `--force`-bypassed Turbo runs and manually cleared `.tsbuildinfo` files after the fix.

**Cost, measured** (cold vs. warm-unchanged `tsc --noEmit`, before this change):

| package | cold | warm (unchanged) | reuse lost |
|---|---|---|---|
| `services/api` | 5.30s | 5.08s | ~0% (noise) |
| `apps/omiro` | 5.10s | 4.63s | ~9% |
| `packages/rpc` | 1.79s | 0.95s | ~47% |
| `packages/db` | 1.46s | 0.57s | ~61% |
| `packages/utils` | 0.57s | 0.50s | ~12% |

This cost is real but bounded:

- It's only paid on invocations Turborepo already decided were necessary — Turbo's own content-hash task cache still skips the script entirely (0 cost) when nothing in a package's own files or its `^build` dependencies changed. This change doesn't touch that layer.
- It never applies to CI, which always starts with an empty `.cache` regardless.
- It has no effect on `pnpm dev:types` / tsserver / editor responsiveness — see [`docs/type-performance.md`](../type-performance.md#the-tsc---noemit-incremental-cache-a-correctness-bug-we-traded-away-on-purpose). That path uses `scripts/watch-types.sh`, a persistent process built on the live project-reference redirect model, and never reads or writes these per-package `.tsbuildinfo` files.
- `services/api`, the single package the rest of `docs/type-performance.md` spends the most effort on, shows ~0 measured cost — its time is dominated by the one-time `DbHandle` union comparison and Kysely chain inference already documented there, not by incremental reuse.

**Not done:** the surgical, hash-based conditional-invalidation approach (option 2). Revisit if the blanket `rm -rf .cache` cost is ever felt in practice — e.g. if `packages/rpc` or `packages/db`-sized packages' typecheck time becomes a measured pain point in normal iteration, not just in this one-off benchmark.
