---
name: type-audit
description: Use this skill when auditing TypeScript type-check performance or IDE TypeScript responsiveness.
---

# Type Audit

## Overview

Use `@hackefeller/type-audit` for portable type-auditing in any project.

Primary command:

```bash
npx @hackefeller/type-audit --project . --threshold 1.0 --json .type-analysis/report.json
```

## Supported Commands

### 1) Audit (default)

```bash
npx @hackefeller/type-audit --project . --threshold 1.0 --json .type-analysis/report.json
```

What it does:
- Discovers `tsconfig.json` projects under `--project`
- Runs trace-based checks
- Reports slow files and instantiation hotspots
- Returns non-zero on regressions/critical failures

### 2) TSServer

```bash
npx @hackefeller/type-audit tsserver --logfile /path/to/tsserver.log --json tsserver-report.json
```

What it does:
- Parses tsserver logs for autocomplete/diagnostics latency
- Reports memory pressure and slow operations

### 3) Compare

```bash
npx @hackefeller/type-audit compare --baseline baseline.json --current current.json
```

What it does:
- Compares two audit JSON reports
- Fails on significant regressions

### 4) Dashboard

```bash
npx @hackefeller/type-audit dashboard --input .type-analysis/report.json --output .type-analysis/dashboard.html
```

Optional:

```bash
npx @hackefeller/type-audit dashboard --audit-first --threshold 1.0 --open
```

## Exit Codes

- `0`: healthy / no actionable regression
- `1`: regression detected
- `2`: critical failure (e.g., OOM/recursion-limit)
- `10`: tool/runtime failure

## Notes

- The command surface is intentionally narrow: `audit`, `tsserver`, `compare`, `dashboard`.
- Do not use removed legacy commands (`run-all`, `analyze`, `diagnose`, `graph`, `instantiations`).
