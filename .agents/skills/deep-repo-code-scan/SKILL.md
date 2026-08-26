---
name: deep-repo-code-scan
description: Scan a repository for abstraction mismatches, dead code, duplicated state or lifecycle logic, cache errors, and unnecessary work; use for deep cleanup audits before refactoring.
---

# Deep Repo Code Scan

Use this skill when the user asks for a deep code scan, simplification audit, cleanup inventory, or a percentage reduction in code. Produce an evidence-backed deletion and consolidation report. Do not edit files unless the user explicitly asks for implementation.

## Governing principle

Look for semantic mismatch, not merely long files. An abstraction is suspicious when its implied contract is absent from the surrounding system.

For example, `useMutation` normally implies mutation lifecycle state plus cache reconciliation. A direct Better Auth update with no React Query cache is usually better represented by a small async hook with local pending state.

Do not remove an abstraction only because it is short or indirect. Preserve behavior, error handling, accessibility, platform constraints, and documented product decisions.

## Scan workflow

1. Read the repository and directory `AGENTS.md` files, governing documentation, package scripts, and the current git status. Treat existing uncommitted changes as user-owned.
2. Map the requested surface end-to-end: entry routes, UI, hooks, services, transport, cache/query keys, persistence, tests, and compatibility paths.
3. Measure before judging. Use `rg`, `rg --files`, `wc -l`, `git diff --stat`, and package-specific dependency graphs where available. Prefer AST/dependency tools such as Knip when installed, but confirm findings with source references.
4. Inventory state owners and side effects. For every query/mutation/store/API call, identify the source of truth, cache key, success update, rollback, retry policy, and consumer of each lifecycle field.
5. Classify findings as safe deletion, safe consolidation, performance cleanup, framework-boundary exception, or product-dependent review. Assign confidence and estimate source/test deletion separately.
6. If implementation is requested, make the smallest coherent batch, preserve behavior with focused tests, then run the relevant format, lint, typecheck, and test commands.

## High-value searches

Search broadly, then inspect each result in context:

```bash
rg -n "useQuery|useMutation|invalidateQueries|setQueryData|cancelQueries" .
rg -n "fetch\(|client\.api|authClient|axios|XMLHttpRequest" .
rg -n "AbortController|onSettled|retry|isPending|isFetching|isSaving|isLoading" .
rg -n "\.filter\([^\n]*\)\.map|\.map\([^\n]*\)\.filter|\.flatMap\([^\n]*\)\.filter" .
rg -n "await [^;]+;" apps packages services
```

These are leads, not automatic violations. Verify ownership and behavior before changing code.

## Mismatch patterns to inspect

### State and data ownership

- React Query wrapping a service that has no React Query cache or invalidation needs.
- A mutation that never invalidates or reconciles related data.
- A query that writes complete objects into a second cache and immediately reads them back through disabled queries.
- Multiple hooks normalizing the same `undefined`/empty state.
- React state and refs duplicating the same lifecycle value without a clear rendering or concurrency reason.
- A state field that no consumer reads.

### Lifecycle duplication

Compare send, retry, regenerate, cancel, upload, and streaming paths for repeated:

- abort-controller management;
- generation/request refs;
- `preparing`, `stopping`, `failed`, `cancelled`, or committed transitions;
- stream event parsing;
- `onSettled` cleanup;
- retry and rollback behavior.

Extract shared lifecycle ownership only when the operations retain their distinct payload, optimistic update, commit, and error semantics.

### Dead and redundant code

- Files exported nowhere in production code.
- Hooks only used by tests after their product path was removed.
- Components with no imports outside their own file.
- Compatibility routes that are no longer referenced and have no documented deep-link purpose.
- Comments or helpers describing behavior that no longer exists.

Never delete legacy routes, migrations, persisted keys, or native integrations solely because they look unused. Confirm the compatibility contract first.

### Unnecessary work

- Chained array iterations over the same collection when one loop is clearer and materially cheaper.
- Sequential independent awaits that can safely use `Promise.all`.
- Repeated sorting/filtering of already-derived data.
- Fetching full records when only an index or summary is consumed.
- Network/cache work immediately discarded by a subsequent request.

Check ordering, authorization, transactional dependencies, and error semantics before parallelizing or combining work.

### Framework boundaries

Rules such as component-only exports may be correct for ordinary files but wrong for route modules, loaders, server contracts, test fixtures, and other framework-required exports. Classify these explicitly. Prefer a narrow documented suppression or file-scoped configuration over disabling a rule globally, and only after confirming the framework contract.

## Finding ledger

Report findings with this shape:

```text
File(s):
Pattern:
Evidence:
Behavior preserved:
Proposed action:
Estimated source deletion:
Estimated test deletion:
Confidence: high | medium | low
Validation:
```

Prioritize high-confidence dead code and duplicate ownership first. Do not claim a percentage reduction unless the denominator and counted files are stated. Separate runtime source reduction from test/comment reduction.

## Validation

For implementation work, run the narrowest relevant checks first, then the repository gate if practical. At minimum:

- formatter and formatter check;
- package lint and typecheck;
- focused tests for changed behavior;
- `git diff --check`;
- React Doctor changed/staged scan when React code changed.

Treat static diagnostics as hypotheses. Read the code, fix the underlying mismatch when possible, and document genuine framework-boundary exceptions. Do not hide warnings merely to improve a score.
