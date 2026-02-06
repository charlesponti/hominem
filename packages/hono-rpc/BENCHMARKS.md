# Type Optimization Benchmarks

This directory tracks performance benchmarks for the type optimization project.

## Quick Start

### View Current Progress
```bash
npm run benchmark:report
# or
./scripts/benchmark-report.sh
```

### Collect New Metrics
```bash
npm run benchmark:update
# or
./scripts/benchmark-update.sh
```

### View Raw Data
```bash
cat benchmarks.json
```

---

## Files

### `benchmarks.json`
**Primary benchmark data file** - tracks metrics across all optimization phases.

Contains:
- Baseline measurements (before optimization)
- Phase 1 partial results (Chats + Events modules)
- Phase 1 complete projections (all 5 modules)
- Phase 2+ planning

**Structure:**
```json
{
  "metadata": { ... },
  "phases": {
    "baseline": { ... },
    "phase1_partial": { ... },
    "phase1_complete": { ... }
  },
  "summary": { ... }
}
```

### `scripts/benchmark-update.sh`
**Data collection script** - runs benchmarks and displays current metrics.

Collects:
- TypeScript compilation times (cold + warm cache)
- Code metrics (lines, bytes, type definitions)
- Serialization function count
- `any` usage count
- TypeScript compiler diagnostics

**Usage:**
```bash
./scripts/benchmark-update.sh
```

Output shows current metrics that can be manually added to `benchmarks.json`.

### `scripts/benchmark-report.sh`
**Progress report script** - displays human-readable summary from `benchmarks.json`.

Shows:
- Overall progress (modules complete, % done)
- Current achievements
- Projected final results
- Phase details
- Next steps

**Usage:**
```bash
./scripts/benchmark-report.sh
```

---

## Benchmark Phases

### Baseline (Estimated)
**Status:** Historical data (before optimization started)
- Type duplication: 100%
- Serialization functions: 13
- Database imports: 0

### Phase 1: Type Deduplication

#### Phase 1 Partial (Current)
**Status:** ✅ Complete for 2/5 modules
- **Modules:** Chats, Events
- **Progress:** 40% (2 of 5 modules)
- **Results:**
  - Compilation: 49% faster (warm cache)
  - Lines removed: 126 lines
  - Functions removed: 3 serialization functions
  - Any usage: Reduced from 13 to 1

#### Phase 1 Complete (Projected)
**Status:** ⏳ Pending (3 modules remaining)
- **Modules:** Notes, Finance, Goals (pending)
- **Projected Results:**
  - Compilation: 67% faster (warm cache)
  - Lines removed: 300 lines
  - Functions removed: 12 serialization functions
  - Any usage: Minimal (1 external library)

### Phase 2: Serialization Elimination (Planned)
Complete elimination of all remaining serialization functions.

### Phase 3: Type Inference (Planned)
Leverage Hono RPC automatic type inference.

---

## Key Metrics Explained

### Compilation Time
- **Cold Cache:** First run after clearing `.tsbuildinfo`
- **Warm Cache:** Subsequent runs with incremental compilation
- **Target:** Warm cache < 4 seconds

### Lines of Code
- **Type Lines:** Lines in `src/types/*.ts` files
- **Route Lines:** Lines in `src/routes/*.ts` files
- **Target:** 20-30% reduction overall

### Serialization Functions
Functions that manually map database types to API types.
- **Pattern:** `function serialize*(obj: any): Type { ... }`
- **Target:** 0 serialization functions (direct returns)

### Any Usage
Explicit `any` type annotations (excluding legitimate JSON fields).
- **Before:** Used in serialization function parameters
- **Target:** 0-1 (only for external library compatibility)

### Type Definitions
Explicit type definitions in `src/types/*.ts`.
- **Before:** ~182 definitions (many duplicates)
- **Target:** ~140 definitions (eliminate duplicates)

---

## How to Update After Each Phase

### 1. Complete Module Optimization
Work on a module (e.g., Notes, Finance, Goals).

### 2. Collect Metrics
```bash
./scripts/benchmark-update.sh
```

This outputs:
- Compilation times
- Code metrics
- TypeScript diagnostics

### 3. Update benchmarks.json

**Option A: Manual Update (Recommended)**
```bash
# Edit benchmarks.json manually
code benchmarks.json

# Update the appropriate phase object with new metrics
# Add date, update modules.optimized, record new measurements
```

**Option B: Script-Assisted**
```bash
# Run update script, copy output
./scripts/benchmark-update.sh > new-metrics.txt

# Manually transfer values to benchmarks.json
```

### 4. Verify Changes
```bash
# View updated report
./scripts/benchmark-report.sh

# Commit changes
git add benchmarks.json
git commit -m "chore: update benchmarks after [module] optimization"
```

---

## Example: Updating After Notes Module

```bash
# 1. Optimize the module
# ... edit code ...

# 2. Collect new metrics
./scripts/benchmark-update.sh

# Output will show:
# Compilation times:
#   Cold cache: 10.5s
#   Warm cache: 5.2s
# Code metrics:
#   Type files: 26
#   Type lines: 2380
#   Serialization functions: 9
#   'any' usage: 1

# 3. Update benchmarks.json
{
  "phases": {
    "phase1_partial": {
      "date": "2026-02-05",
      "modules": {
        "optimized": 3,  // Changed from 2
        "optimizedList": ["chats", "events", "notes"]  // Added "notes"
      },
      "compilation": {
        "warmCacheSeconds": 5.2  // Updated
      },
      "codeMetrics": {
        "totalTypeLines": 2380,  // Updated
        "serializationFunctions": 9  // Updated
      }
    }
  }
}

# 4. Verify and commit
./scripts/benchmark-report.sh
git add benchmarks.json
git commit -m "chore: update benchmarks after notes module optimization"
```

---

## Interpreting Results

### Good Signs
✅ Compilation time decreasing
✅ Lines of code decreasing
✅ Serialization functions decreasing
✅ Any usage at 0-1
✅ Database imports increasing

### Warning Signs
⚠️ Compilation time increasing
⚠️ Lines of code increasing
⚠️ New serialization functions added
⚠️ Any usage increasing

---

## Related Documentation

- **Full Benchmark Report:** `/private/tmp/claude/.../performance-benchmarks.md`
- **Optimization Plan:** `/private/tmp/claude/.../type-optimization-plan.md`
- **Implementation Guide:** `/private/tmp/claude/.../type-patterns-guide.md`
- **Example Transformation:** `/private/tmp/claude/.../example-transformation-chats.md`

---

## NPM Scripts (Optional)

Add to `package.json`:
```json
{
  "scripts": {
    "benchmark:report": "./scripts/benchmark-report.sh",
    "benchmark:update": "./scripts/benchmark-update.sh"
  }
}
```

---

## Notes

- Baseline metrics are estimated from code history
- Measurements taken on macOS Darwin 25.3.0
- TypeScript 5.9.3 with Bun runtime
- Warm cache represents typical developer experience
- Compilation improvements compound as more modules are optimized
