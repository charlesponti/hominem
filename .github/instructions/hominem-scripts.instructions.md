---
applyTo: 'scripts/**'
---

# Scripts & Tooling

| Script | Purpose | Usage |
|--------|---------|-------|
| `type-performance.ts` | **Unified Type Performance Analysis** - Combines all type audit functionality | `bun run type-perf:audit`, `bun run type-perf:diagnose`, etc. |
| `generate-dashboard.ts` | Generates interactive HTML dashboard from audit data | `bun run type-perf:dashboard -- --audit-first --open` |
| `compare-type-performance.ts` | Compares current vs baseline performance | `bun run type-perf:compare -- --baseline <file> --current <file>` |
| `benchmarker.tsx` | Micro-benchmark utility (exportable, no CLI) | `import { benchmarkAll } from './scripts/benchmarker'` |

## Quick Start

### Run Full Type Audit
```bash
# Standard audit with dependency graph analysis
bun run type-perf:audit -- --graph

# Include JSON output for CI
bun run type-perf:audit -- --json type-audit-report.json --graph

# Tighten threshold to 0.5s
bun run type-perf:audit -- --threshold 0.5
```

### IDE Performance Analysis (TSServer)
```bash
# Analyze tsserver logs for real IDE performance
bun run type-perf:tsserver -- --logfile /path/to/tsserver.log

# Or generate dashboard with tsserver analysis
bun run type-perf:dashboard -- --audit-first --open
```

**To enable tsserver logging:**
1. In VS Code `settings.json`:
   ```json
   {
     "typescript.tsserver.log": "verbose"
   }
   ```
2. Restart TS server: Cmd+Shift+P > "TypeScript: Restart TS Server"
3. Check Output panel > TypeScript for log location

### Type Dependency Graph Analysis
```bash
# Analyze a specific package's type dependencies
bun run type-perf:graph -- --package packages/db

# Output to JSON for further processing
bun run type-perf:graph -- --package packages/db --output graph.json
```

**What it identifies:**
- Type hub files (high centrality)
- Barrel files (re-export everything)
- Import cycles
- Cross-file dependencies

### Granular Instantiation Tracking
```bash
# Find exact code locations causing type explosion
bun run type-perf:instantiations -- --package packages/db

# With custom threshold
bun run type-perf:instantiations -- --package packages/db --threshold 500
```

### Detailed Diagnosis
```bash
# Full per-file analysis with suggestions
bun run type-perf:diagnose

# For specific package only
bun run type-perf:diagnose -- --package packages/hono-rpc

# With custom threshold
bun run type-perf:diagnose -- --threshold 0.5
```

### Interactive Dashboard
```bash
# Generate from existing audit
bun run type-perf:dashboard -- --input report.json --open

# Run audit first, then generate dashboard
bun run type-perf:dashboard -- --audit-first --threshold 0.5 --open
```

**Dashboard includes:**
- Performance metrics cards
- Package performance bar chart
- Type checking timeline
- Slowest files table
- Interactive dependency graph (D3)
- Top instantiation sites
- Actionable recommendations

### CI Performance Comparison
```bash
# Compare against baseline (used in CI)
bun run type-perf:compare -- --baseline baseline.json --current current.json
```

**Exit codes:**
- `0` - No regression
- `1` - Warning (>20% increase)
- `2` - Critical (>50% increase or new errors)

## What the Audit Does

### Standard Mode (`audit`)
1. Runs `tsc` with `--generateTrace` for each app and package
2. Parses per-file type-check durations and instantiation counts
3. Builds type dependency graph (with `--graph` flag)
4. Highlights files exceeding the threshold
5. Provides targeted suggestions based on code patterns

### New Capabilities (Phase 1-3)

**TSServer Mode (`tsserver`):**
- Parses tsserver logs for real IDE metrics
- Measures autocomplete latency, diagnostics latency
- Tracks memory usage and file count
- Identifies slow operations (module resolution, etc.)

**Graph Mode (`graph`):**
- Scans all TypeScript files in package
- Builds import/export dependency graph
- Calculates centrality scores for each file
- Detects barrel files and import cycles
- Identifies "type hubs" (files causing cascade re-checks)

**Instantiations Mode (`instantiations`):**
- Analyzes trace.json for type instantiation events
- Extracts exact line/column locations
- Classifies by type (MappedType, ConditionalType, etc.)
- Aggregates by file and call site

**Dashboard Mode (`dashboard`):**
- Generates interactive HTML visualization
- Uses Chart.js for performance charts
- Uses D3.js for dependency graph
- Provides actionable recommendations

## Common Patterns Detected

### Barrel Files
```typescript
// DETECTED: packages/db/src/schema/types.ts
export * from './auth.types'
export * from './bookmarks.types'
// ... 27 more
```
**Impact**: Causes IDE to load all types when any file is opened
**Fix**: Use direct imports
```typescript
// Change from
import type { User } from '@hominem/db/schema'
// To
import type { User } from '@hominem/db/schema/users'
```

### Type Hubs
Files with high centrality (>0.7) imported by many others.
**Impact**: Changes trigger widespread re-type-checking
**Fix**: Split into smaller, focused exports

### High Instantiations
```
📍 Top Instantiation Sites:
Count      | Type             | Location
-----------|------------------|----------------------------------------
    15,420 | GenericInference | packages/db/src/schema/users.ts:45:12
```
**Impact**: Slows type checking and IDE responsiveness
**Fix**: Add explicit return types at these locations

### Deep Pick/Omit Chains
```typescript
// DETECTED
export type UserOutput = Pick<User, 'id' | 'name'> & Pick<Profile, 'avatar'>
```
**Impact**: Creates complex type instantiations
**Fix**: Flatten to interface
```typescript
export interface UserOutput {
  id: string
  name: string
  avatar: string
}
```

## CI Integration

The type-performance.yml workflow automatically:
- Runs on PRs touching TypeScript files
- Generates dashboard artifact
- Comments on PR with performance summary
- Fails if >20% regression detected
- Maintains baseline from main branch

**To view results:**
1. Check PR comment for summary
2. Download artifact for full dashboard
3. Open dashboard.html in browser

## Performance Budgets

| Metric | Budget | Critical | Tool |
|--------|--------|----------|------|
| Package check time | < 1.0s | > 2.0s | `audit` |
| File check time | < 0.5s | > 1.0s | `diagnose` |
| Type instantiations | < 5,000 | > 10,000 | `instantiations` |
| IDE autocomplete | < 100ms | > 500ms | `tsserver` |
| IDE diagnostics | < 500ms | > 1000ms | `tsserver` |
| Memory usage | < 2GB | > 3GB | `tsserver` |
| Type hubs | < 5 | > 10 | `graph` |

## Available npm Scripts

```json
{
  "type-audit": "bun run scripts/type-performance.ts run-all",
  "type-perf:analyze": "bun run scripts/type-performance.ts analyze",
  "type-perf:audit": "bun run scripts/type-performance.ts audit",
  "type-perf:diagnose": "bun run scripts/type-performance.ts diagnose",
  "type-perf:tsserver": "bun run scripts/type-performance.ts tsserver",
  "type-perf:graph": "bun run scripts/type-performance.ts graph",
  "type-perf:instantiations": "bun run scripts/type-performance.ts instantiations",
  "type-perf:dashboard": "bun run scripts/generate-dashboard.ts",
  "type-perf:compare": "bun run scripts/compare-type-performance.ts"
}
```

## Report Ends With Clear Next Steps

Every audit mode provides:
1. Summary statistics
2. List of problematic files/patterns
3. Specific fix suggestions
4. Priority ranking (🔥 > ⚠️ > 💡)
5. JSON output for CI/automation

The JSON output can be used with `generate-dashboard.ts` to create interactive visualizations for stakeholder presentations or detailed debugging sessions.
