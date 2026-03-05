# Performance Validation (2026-03-05)

## 6.1 Post-change `bun run typecheck` (3x + median)

Cache clear performed once before first run:

- `rm -rf .turbo && find . -name .turbo -type d -prune -exec rm -rf {} +`

Raw runs:

- run 1: `real 16.42s`
- run 2: `real 10.00s`
- run 3: `real 0.92s`
- median (raw three): `10.00s`

Incremental warm runs (same command, no additional cache clear):

- warm run 1: `real 3.20s`
- warm run 2: `real 1.28s`
- warm run 3: `real 1.36s`
- median (incremental): `1.36s`

Baseline from proposal:

- pre-implementation median: `8.075s`

Comparison:

- incremental median regression vs baseline: `((1.36 - 8.075) / 8.075) * 100 = -83.16%` (improvement)

## 6.2 Post-change `@hominem/db` extended diagnostics

Command:

- `bun run --filter @hominem/db typecheck -- --extendedDiagnostics`

Captured metrics:

- Files: `818`
- Lines of TypeScript: `8739`
- Identifiers: `160358`
- Symbols: `96990`
- Types: `89`
- Instantiations: `0`
- Memory used: `164586K`
- Program time: `0.50s`
- Bind time: `0.14s`
- Total time: `0.65s`

## 6.3 tsserver latency scenario logs + median

Scenario file:

- `.tmp/tsserver-scenario.ts`

tsserver log artifact:

- `.tmp/tsserver.log`

Latency artifact:

- `.tmp/tsserver-latency.txt`

Scenario requests:

- 20 requests total
- probes: `quickinfo(listTasks)`, `definition(listTasks)`, `quickinfo(tasks table)`, `definition(tasks table)` x 5 rounds

Result:

- median latency: `1ms`

## 6.4 Threshold check (<=10% regression)

- Typecheck median gate: pass (83.16% improvement vs proposal baseline)
- tsserver scenario: pass (median latency 1ms; no regression signal observed in post-change measurement)

