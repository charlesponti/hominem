# TypeScript Performance Testing

This monorepo provides tools to identify and prevent TypeScript performance issues. We use two approaches:

1. **@ark/attest** - For tracking type instantiations and preventing regressions
2. **TypeScript Trace Analysis** - For deep-dive performance profiling

This document explains how to use these tools effectively.

## What is @ark/attest?

`@ark/attest` is a testing library that can measure TypeScript's type-checking performance by tracking:

- **Type Instantiations**: How many times TypeScript needs to instantiate generic types
- **Type Completions**: How many autocomplete suggestions are generated for a given type

## Why Track Type Performance?

TypeScript performance issues often manifest as:

- Slow IDE autocomplete and type checking
- Long build times for `tsc`
- High memory usage during type checking
- Sluggish developer experience

These issues often stem from:

- Deeply nested generic types
- Large union types (50+ members)
- Complex mapped types
- Recursive types without bounds
- Excessive utility type composition (`Pick<Omit<...>>`)

## Quick Start: Finding Performance Issues

### Method 1: Automated Trace Analysis (Recommended for initial investigation)

Run the TypeScript trace analyzer to get a comprehensive performance report:

```bash
bun run analyze:type-perf
```

This will:

- Generate TypeScript trace data for your entire project
- Show the 20 slowest type checks
- Show the 20 files with the most type instantiations
- Provide actionable optimization suggestions

**When to use**: When you notice slow IDE performance or long type-checking times

### Method 2: Type Performance Tests (Recommended for CI and regression prevention)

Run type performance tests with @ark/attest:

```bash
# Run all type performance tests
bun run test:type-perf

# Update snapshots after intentional changes
bun run test:type-perf:update

# Run tests for specific package
bun test packages/db/**/*.type-perf.test.ts
```

**When to use**: As part of your CI pipeline to catch performance regressions

## Understanding Test Results

### First Run (Creating Baselines)

```typescript
attest(() => {
  type Test = MyComplexType;
}).type.instantiations.snap();
```

On the first run, this creates a snapshot file in `.attest/` with the current instantiation count.

### Subsequent Runs (Detecting Regressions)

The test will fail if the instantiation count changes significantly, helping you catch performance regressions.

### Setting Explicit Thresholds

```typescript
attest(() => {
  type Test = MyComplexType;
}).type.instantiations.lessThan(500);
```

This sets a hard limit. The test fails if instantiations exceed 500.

## Writing Type Performance Tests

### 1. For Database Schemas

Test your Drizzle schema types:

```typescript
import { attest } from '@ark/attest';
import type { MyTable, MyTableInsert, MyTableSelect } from './schema';

it('should efficiently infer table type', () => {
  attest(() => {
    type Test = MyTable;
  }).type.instantiations.lessThan(100);
});

it('should efficiently infer complex query with relations', () => {
  attest(() => {
    type QueryResult = MyTable & {
      relatedTable: RelatedTable[];
    };
    type Test = QueryResult;
  }).type.instantiations.lessThan(300);
});
```

### 2. For tRPC Routers

Test router type inference:

```typescript
import { attest } from '@ark/attest';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { myRouter } from './router';

type RouterInputs = inferRouterInputs<typeof myRouter>;
type RouterOutputs = inferRouterOutputs<typeof myRouter>;

it('should efficiently infer all router inputs', () => {
  attest(() => {
    type Test = RouterInputs;
  }).type.instantiations.lessThan(1000);
});

it('should efficiently infer specific procedure input', () => {
  attest(() => {
    type Test = RouterInputs['myProcedure'];
  }).type.instantiations.lessThan(200);
});
```

### 3. For Complex Utility Types

Test custom type utilities:

```typescript
import { attest } from '@ark/attest';
import type { MyUtilityType } from './types';

it('should efficiently apply utility type', () => {
  attest(() => {
    type Base = {
      /* complex base type */
    };
    type Transformed = MyUtilityType<Base>;
    type Test = Transformed;
  }).type.instantiations.snap();
});
```

## Finding Performance Issues

### Step 1: Identify Slow Areas

Look for:

- Files where IDE autocomplete is slow
- Modules that take long to type-check
- Types that cause high memory usage

### Step 2: Add Baseline Tests

Add tests for the slow types:

```typescript
it('should track current performance', () => {
  attest(() => {
    type Test = SuspectedSlowType;
  }).type.instantiations.snap();
});
```

Run the test to create a baseline.

### Step 3: Analyze the Numbers

General guidelines:

- **< 100 instantiations**: Very efficient, simple types
- **100-500**: Reasonable for moderately complex types
- **500-1000**: Acceptable for complex types (e.g., router types)
- **1000-5000**: Should investigate for optimization opportunities
- **> 5000**: Likely causing performance issues

### Step 4: Optimize

Common optimization strategies:

#### Extract Named Types

❌ Bad:

```typescript
type Complex = Pick<Omit<Base, 'id'>, 'name' | 'email'> & { metadata: Record<string, unknown> };
```

✅ Good:

```typescript
type WithoutId = Omit<Base, 'id'>;
type RequiredFields = Pick<WithoutId, 'name' | 'email'>;
type Complex = RequiredFields & { metadata: Record<string, unknown> };
```

#### Simplify Union Types

❌ Bad:

```typescript
type Status = 'pending' | 'approved' | 'rejected' | 'cancelled' | /* 50 more values */;
```

✅ Good:

```typescript
// Use discriminated unions or enums
enum Status {
  Pending = 'pending',
  Approved = 'approved',
  // ...
}
```

#### Add Explicit Type Annotations

❌ Bad:

```typescript
const result = await api.complex.nested.procedure.query(/* complex inference */);
```

✅ Good:

```typescript
const result: KnownResultType = await api.complex.nested.procedure.query(input);
```

#### Avoid Deep Utility Chains

❌ Bad:

```typescript
type T = Partial<Pick<Omit<Required<Base>, 'a'>, 'b' | 'c'>>;
```

✅ Good:

```typescript
type BaseRequired = Required<Base>;
type WithoutA = Omit<BaseRequired, 'a'>;
type SelectedFields = Pick<WithoutA, 'b' | 'c'>;
type T = Partial<SelectedFields>;
```

### Step 5: Verify Improvement

Run the test again and compare:

```bash
bun test path/to/file.type-perf.test.ts
```

If instantiations decreased, the optimization worked!

## Existing Test Files

- `type-performance.test.ts` - Root-level examples and documentation
- `packages/db/src/schema/finance.schema.type-perf.test.ts` - Finance schema types
- `packages/trpc/src/routers/finance/finance.transactions.type-perf.test.ts` - tRPC router types

## Adding Tests for New Code

When adding complex types:

1. Add a corresponding `.type-perf.test.ts` file
2. Test the main exported types
3. Set reasonable thresholds based on complexity
4. Run tests before committing

## CI Integration

Type performance tests can be run in CI to:

- Prevent performance regressions
- Enforce performance budgets
- Catch expensive type changes in PRs

Add to your CI workflow:

```yaml
- name: Type Performance Tests
  run: bun test "**/*.type-perf.test.ts"
```

## Troubleshooting

### Tests fail after dependency updates

Some updates change type instantiation counts. Review the changes:

- If the change is acceptable, update snapshots
- If performance regressed significantly, investigate the dependency

### Tests are flaky

Type instantiation counts should be stable. If tests are flaky:

- Ensure you're testing the right types
- Check for non-deterministic type inference
- Simplify the test case

### How to find the expensive type

Use TypeScript's `--generateTrace` flag:

```bash
tsc --generateTrace trace --noEmit
```

Then analyze the trace files to find expensive types.

## Resources

- [@ark/attest documentation](https://github.com/arktypeio/arktype/tree/main/ark/attest)
- [TypeScript Performance Wiki](https://github.com/microsoft/TypeScript/wiki/Performance)
- [Analyzing Type Instantiations](https://github.com/microsoft/TypeScript/wiki/Performance#investigating-type-instantiation-depth-issues)
