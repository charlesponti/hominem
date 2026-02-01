---
name: type-audit
description: This skill should be used when analyzing TypeScript compiler performance. It runs diagnostic scripts to identify slow types, bottlenecks, and recursive inference, and provides an actionable fix plan to keep type-checking under 1s.
---

# Type Audit

## Overview

This skill enables automated monitoring and diagnosis of TypeScript compiler performance. It helps maintain the monorepo's performance budget (< 1s per package) by identifying expensive type instantiations and deep recursion.

## Workflow

To perform a type audit, follow these steps:

### 1. Execute Audit Script
Run the built-in audit script to gather raw performance data.
- Run `bun run type:audit` (or `bun run scripts/type-performance.ts audit`).
- For a full monorepo benchmark, run `bun run type-audit` (runs `run-all`).

### 2. Analyze Trace (If Needed)
If a specific package is flagged as slow, generate and analyze a compiler trace:
- Generate trace: `tsc --generateTrace .type-traces/<package-name> --noEmit`
- Analyze trace: `bun run scripts/type-performance.ts analyze .type-traces/<package-name>`

### 3. Diagnose Specific Bottlenecks
Use the diagnostic command for targeted fixes:
- `bun run scripts/type-performance.ts diagnose --threshold 0.5`

### 4. Provide Fix Plan
Analyze the output from the above commands and propose a detailed plan. Common fixes include:
- **Flattening intersections**: Replace `A & B` with an interface extension if possible.
- **Explicit return types**: Add return types to complex functions to stop the compiler from "guessing."
- **Simplifying utility types**: Reduce deep nesting of `Pick`, `Omit`, and `Partial`.
- **Splitting inline types**: Move large inline object types to named interfaces.

## Tactical Reference
- Refer to `.github/instructions/performance-first.instructions.md` for standard budgets.
- Check `hominem-scripts.instructions.md` for script-specific flags.
