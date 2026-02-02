---
name: type-audit
description: This skill should be used when analyzing TypeScript compiler performance. It runs diagnostic scripts to identify slow types, bottlenecks, recursive inference, and provides an actionable fix plan to keep type-checking under 1s. Now includes tsserver IDE performance analysis, type dependency graph visualization, and granular instantiation tracking.
---

# Type Audit

## Overview

This skill enables automated monitoring and diagnosis of TypeScript compiler performance. It helps maintain the monorepo's performance budget (< 1s per package) by identifying expensive type instantiations, deep recursion, and IDE performance bottlenecks.

**New in Phase 1-3:**
- **TSServer Log Analysis**: Measure real IDE performance (autocomplete, diagnostics)
- **Type Dependency Graph**: Visualize cross-file type dependencies and identify "type hubs"
- **Granular Instantiation Tracking**: Pinpoint exact code locations causing type explosion
- **Interactive Dashboard**: Visual HTML reports with charts and actionable recommendations
- **CI Performance Gates**: Automated regression detection in pull requests

## Quick Start

### Run Full Audit
```bash
# Standard audit with dependency graph analysis
bun run type-perf:audit -- --graph

# Or with custom threshold
bun run type-perf:audit -- --threshold 0.5 --json report.json
```

### New Commands (Phase 1-3)

#### 1. TSServer IDE Performance Analysis
```bash
# Generate tsserver log first (in VS Code settings):
# "typescript.tsserver.log": "verbose"

# Then analyze
bun run type-perf:tsserver -- --logfile /path/to/tsserver.log --json tsserver-report.json

# Or with dashboard
bun run type-perf:dashboard -- --audit-first --open
```

**What it measures:**
- Autocomplete latency (ms per completion request)
- Diagnostics latency (time to show errors after edit)
- Memory usage (heap pressure)
- Module resolution time
- Slow operations (file loading, symbol resolution)

**When to use:**
- IDE feels sluggish
- Autocomplete is slow
- Type errors take long to appear
- Memory usage is high

#### 2. Type Dependency Graph Analysis
```bash
# Analyze a specific package's type dependencies
bun run type-perf:graph -- --package packages/db --output graph.json

# Visualize in dashboard
bun run type-perf:dashboard -- --audit-first --open
```

**What it identifies:**
- Type hub files (high centrality, cause cascade re-checks)
- Barrel files (re-export everything, slow down IDE)
- Import cycles (cause type resolution loops)
- Cross-package dependencies
- Files imported by many others (high impact)

**Key metrics:**
- **Centrality**: % of type graph that depends on this file
- **Fan-in**: Number of files importing this
- **Fan-out**: Number of files this imports
- **Barrel**: Whether file primarily re-exports

#### 3. Granular Instantiation Analysis
```bash
# Pinpoint exact code locations causing type explosion
bun run type-perf:instantiations -- --package packages/db --threshold 1000
```

**What it tracks:**
- Exact line/column of expensive type operations
- Instantiation type (MappedType, ConditionalType, GenericInference, IndexedAccess)
- Count per call site
- File-level aggregation

**Common patterns detected:**
```typescript
// MappedType: { [K in T]: V } expansions
type Mapped<T> = { [K in keyof T]: Transform<T[K]> }

// ConditionalType: T extends U ? X : Y chains
type DeepConditional<T> = T extends A ? B : T extends C ? D : E

// GenericInference: Complex generic parameter inference
function process<T extends ComplexConstraint>(data: T): InferredReturn<T>

// IndexedAccess: T[K] type lookups
function get<T, K extends keyof T>(obj: T, key: K): T[K]
```

#### 4. Interactive Dashboard
```bash
# Generate dashboard from existing audit
bun run type-perf:dashboard -- --input .type-analysis/audit-report.json --open

# Or run audit first, then generate
bun run type-perf:dashboard -- --audit-first --threshold 0.5 --open
```

**Dashboard sections:**
1. **Overview**: Metrics cards, package performance chart, timeline
2. **Slow Files**: Sortable table of slowest files with status badges
3. **Dependency Graph**: Interactive D3 force-directed visualization
4. **Instantiations**: Bar chart of top instantiation sites
5. **Recommendations**: Actionable fixes prioritized by impact

#### 5. CI Performance Comparison
```bash
# Compare current performance against baseline
bun run type-perf:compare -- --baseline baseline.json --current current.json
```

**Exit codes:**
- `0`: No significant regression
- `1`: Performance regression detected (>20% increase)
- `2`: Critical regression (>50% increase or new critical errors)

## Workflow

### 1. Execute Audit Script
Run the built-in audit script to gather raw performance data.
- Run `bun run type-perf:audit` for standard audit
- Add `--graph` flag to include dependency analysis
- For a full monorepo benchmark: `bun run type-audit`

### 2. Analyze IDE Performance (TSServer)
If IDE feels sluggish:
1. Enable tsserver logging in VS Code: `"typescript.tsserver.log": "verbose"`
2. Restart TS server (Cmd+Shift+P > TypeScript: Restart TS Server)
3. Find log location in Output panel > TypeScript
4. Run: `bun run type-perf:tsserver -- --logfile <path>`

### 3. Identify Type Hubs
Find files causing cascade re-checks:
```bash
bun run type-perf:graph -- --package packages/db
```

Look for:
- Files with centrality > 0.7 (imported by 70%+ of graph)
- Barrel files (re-export everything)
- High fan-in count (many importers)

### 4. Pinpoint Expensive Types
Track exact instantiation sites:
```bash
bun run type-perf:instantiations -- --package packages/hono-rpc
```

### 5. Generate Dashboard
Create visual report:
```bash
bun run type-perf:dashboard -- --audit-first --open
```

### 6. Diagnose Specific Bottlenecks
Use the diagnostic command for targeted fixes:
- `bun run type-perf:diagnose --threshold 0.5`
- Or for specific package: `bun run type-perf:diagnose -- --package packages/db`

### 7. CI Regression Detection
The type-performance.yml workflow automatically:
- Runs on every PR touching TypeScript files
- Compares against main branch baseline
- Comments on PR with performance summary
- Blocks merges if >20% regression detected
- Generates dashboard artifact for download

## Understanding Reports

### Type Hub Files
Files with high centrality cause widespread re-checks when modified:
```
Centrality | File                           | Barrel | Exports
-----------|--------------------------------|--------|--------
     0.923 | packages/db/src/schema/types.ts| ✅     | 29
     0.756 | packages/hono-rpc/src/types.ts | ✅     | 17
```

**Fix**: Replace barrel files with direct imports
```typescript
// BEFORE (slow - loads all types)
import type { User, Post, Comment } from '@hominem/db/schema/types'

// AFTER (fast - only loads what you need)
import type { User } from '@hominem/db/schema/users'
import type { Post } from '@hominem/db/schema/posts'
```

### Instantiation Sites
Shows exact locations causing type explosion:
```
Count      | Type             | Location
-----------|------------------|----------------------------------------
    15,420 | GenericInference | packages/db/src/schema/users.ts:45:12
     8,932 | MappedType       | packages/utils/src/types.ts:78:3
     5,671 | ConditionalType  | packages/hono-rpc/src/app.ts:92:8
```

**Fix**: Add explicit types at these locations
```typescript
// BEFORE (slow - inference explosion)
function processUsers(users: User[]) {
  return users.map(u => transform(u))
}

// AFTER (fast - explicit return type)
function processUsers(users: User[]): ProcessedUser[] {
  return users.map(u => transform(u))
}
```

### TSServer Metrics
Real IDE performance indicators:
```
🎯 Latency Metrics:
  Autocomplete latency:     1250ms 🔥
  Diagnostics latency:      2100ms 🔥

💾 Memory & Scale:
  Memory usage:             2850MB
  Files in memory:          1247
```

**Interpretation:**
- Autocomplete >500ms: Users notice lag
- Diagnostics >1000ms: Errors feel delayed
- Memory >2GB: Risk of OOM crashes
- Files >1000: Consider splitting project

## Fix Patterns

### 1. Barrel File Elimination
**Problem**: `export * from './...'` loads entire module graph
**Solution**: Direct imports
```typescript
// packages/db/src/schema/types.ts (29 exports) - DELETE THIS FILE
export * from './users'
export * from './posts'
// ... 27 more

// CONSUMERS: Change from
import type { User, Post } from '@hominem/db/schema'

// TO
import type { User } from '@hominem/db/schema/users'
import type { Post } from '@hominem/db/schema/posts'
```

### 2. Explicit Return Types
**Problem**: Generic inference recalculates on every call
**Solution**: Annotate function returns
```typescript
// BEFORE
async function getUser(id: string) {
  return db.query.users.findFirst({ where: { id } })
}

// AFTER
async function getUser(id: string): Promise<User | null> {
  return db.query.users.findFirst({ where: { id } })
}
```

### 3. Simplify Generic Chains
**Problem**: Deep Pick/Omit chains create type explosion
**Solution**: Flatten to named types
```typescript
// BEFORE
export type UserOutput = Pick<User, 'id' | 'name'> & 
  Pick<Profile, 'avatar'> & 
  Omit<Settings, 'secrets'>

// AFTER
export interface UserOutput {
  id: string
  name: string
  avatar: string
  theme: string
}
```

### 4. Split Large Files
**Problem**: Files >500 LOC cause memory pressure
**Solution**: Split by domain
```
BEFORE:
  packages/db/src/schema.ts (2000 lines, 69 domains)

AFTER:
  packages/db/src/schema/users.ts
  packages/db/src/schema/posts.ts
  packages/db/src/schema/comments.ts
  # ... separate files
```

### 5. Reduce Intersection Types
**Problem**: Complex intersections (&) slow type checking
**Solution**: Use interfaces with extends
```typescript
// BEFORE
type ComplexUser = User & Profile & Settings & Permissions

// AFTER
interface ComplexUser extends User, Profile, Settings {
  permissions: Permissions
}
```

## CI Integration

The `.github/workflows/type-performance.yml` workflow:

1. **Runs on**: PRs modifying TypeScript, pushes to main
2. **Artifacts**: Generates dashboard.html for download
3. **Comments**: Posts summary on PR with:
   - Package performance table
   - Slow files list
   - Type hubs detected
   - Critical issues
4. **Blocks**: Fails check if >20% regression detected

**Viewing Results:**
1. Open PR checks tab
2. Click "Type Performance Report" comment
3. Download artifact for full dashboard
4. Check detailed analysis in dashboard.html

## Performance Budgets

| Metric | Budget | Critical |
|--------|--------|----------|
| Package check time | < 1.0s | > 2.0s |
| File check time | < 0.5s | > 1.0s |
| Type instantiations | < 5,000 | > 10,000 |
| IDE autocomplete | < 100ms | > 500ms |
| IDE diagnostics | < 500ms | > 1000ms |
| Memory usage | < 2GB | > 3GB |
| Type hubs | < 5 | > 10 |

## Tactical Reference

- Refer to `.github/instructions/performance-first.instructions.md` for standard budgets.
- Check `hominem-scripts.instructions.md` for script-specific flags.

### Available Scripts
```bash
# Standard audit
bun run type-perf:audit

# With dependency graph analysis
bun run type-perf:audit -- --graph

# TSServer IDE analysis
bun run type-perf:tsserver -- --logfile <path>

# Type dependency graph
bun run type-perf:graph -- --package <pkg>

# Granular instantiation tracking
bun run type-perf:instantiations -- --package <pkg>

# Detailed diagnosis
bun run type-perf:diagnose -- --package <pkg>

# Interactive dashboard
bun run type-perf:dashboard -- --audit-first --open

# Compare with baseline
bun run type-perf:compare -- --baseline <file> --current <file>
```

## Troubleshooting

**"No trace data found"**
Run with trace generation first:
```bash
bun run type-perf:audit -- --graph
```

**"TSServer log not found"**
Enable logging in VS Code settings.json:
```json
{
  "typescript.tsserver.log": "verbose",
  "typescript.tsserver.trace": "verbose"
}
```

**Dashboard shows "No data available"**
Ensure JSON report exists:
```bash
bun run type-perf:audit -- --json .type-analysis/report.json
bun run type-perf:dashboard -- --input .type-analysis/report.json
```

**High memory usage during audit**
Increase Node memory limit in scripts:
```typescript
// Already set to 8GB in type-performance.ts
NODE_OPTIONS: '--max-old-space-size=8192'
```
