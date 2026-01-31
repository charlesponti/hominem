---
applyTo: 'scripts/**'
---

# Scripts & Tooling

| Script                        | Purpose                                                                                           | Usage                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `type-inference-audit.ts`     | Audits type inference latency across monorepo and emits actionable fixes to achieve < 1s per file | `bun type:audit [--json report.json] [--threshold 1.0]`     |
| `analyze-type-performance.ts` | Existing: generate `tsc` trace and show slowest checks/instantiations                             | `bun scripts/analyze-type-performance.ts [--json out.json]` |
| `find-slow-types.ts`          | Existing: per-package type check to catch recursion/OOM crashes                                   | `bun scripts/find-slow-types.ts [--summary-json out.json]`  |
| `benchmarker.tsx`             | Micro-benchmark utility (exportable, no CLI)                                                      | `import { benchmarkAll } from './scripts/benchmarker'`      |

## Quick Start

```bash
# Run full audit with a 1.0s threshold (default) and see console report
bun type:audit

# Include JSON output for CI
bun type:audit --json type-audit-report.json

# Tighten threshold to 0.5s
bun type:audit --threshold 0.5
```

## What the audit does

1. Runs `tsc` with `--generateTrace` for each app and package.
2. Parses per-file type-check durations and instantiation counts.
3. Highlights files exceeding the threshold and provides targeted suggestions:
   - Split large inline types into named aliases.
   - Reduce nesting of generic utility types (`Pick<Omit<...>>`).
   - Flatten intersections.
   - Avoid large discriminated unions.
   - Prune re-exports that cause reference-graph bloat.
   - Prefer explicit return types over heavy inference.

The report ends with clear next steps and can output structured JSON for CI.
