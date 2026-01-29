# TypeScript and tsserver Performance Optimization Guide

## Overview

This guide articulates current TypeScript performance optimizations and best practices in the Hominem monorepo. It covers architecture, compiler settings, IDE configuration, type-level improvements, and monitoring tools for a fast, reliable developer experience.

> **Related Documents:**
> - [PERFORMANCE_ROADMAP.md](PERFORMANCE_ROADMAP.md) — Strategic vision for achieving <1s type-checking (95% improvement)
> - [TYPES_FIRST_ARCHITECTURE.md](TYPES_FIRST_ARCHITECTURE.md) — Type system design that enables sub-second performance
> - [ARCHITECTURE_GUIDE.md](ARCHITECTURE_GUIDE.md) — Navigation hub for all architecture documentation
>
> **This Document:** Current state optimizations, best practices, and how to implement them today.

---

## Architecture: Internal Packages Pattern

The monorepo uses the "Internal Packages" pattern, a modern best practice for TypeScript monorepos as of 2025/2026. This prioritizes developer experience by avoiding project references and path mappings.

### Key Principles

- **No path mappings** in tsconfig for workspace packages
- **No project references** between packages
- **Workspace resolution** via Bun (native support)
- **Source files** used during development for instant type updates
- **Built files** used for production
- **TypeScript LSP** handles in-memory type generation

### Benefits

- Zero build time for local development
- Instant type updates across packages when files change
- No editor vs build discrepancy
- Simpler configuration
- Perfect for Bun's native workspace support
- Scales well for medium monorepos (~16 packages)

### Directory Structure

```
hominem/
├── packages/              # Core packages (16 packages)
│   ├── ai/
│   ├── auth/
│   ├── db/
│   ├── finance/
│   └── ... (12 more)
├── apps/                  # Applications (3 apps)
│   ├── finance/
│   ├── notes/
│   └── rocco/
├── services/              # Services (2 services)
│   ├── api/
│   └── workers/
├── tools/                 # Tools (1 tool)
│   └── cli/
├── tsconfig.base.json     # Root TypeScript configuration
└── tsconfig.json          # Root project references (optional)
```

### TypeScript Configuration

#### Root Configuration (`tsconfig.base.json`)

Shared compiler options:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "incremental": true,
    "composite": true,
    "disableSourceOfProjectReferenceRedirect": true,
    "assumeChangesOnlyAffectDirectDependencies": true,
    "skipLibCheck": true
  }
}
```

Key settings:

- `moduleResolution: "Bundler"` - Optimized for Bun and bundlers
- `disableSourceOfProjectReferenceRedirect` - Prevents traversing package source trees
- `assumeChangesOnlyAffectDirectDependencies` - Speeds up incremental builds

#### Package Configuration (`packages/*/tsconfig.json`)

Each package extends the base:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "./build",
    "composite": true
  },
  "include": ["src/**/*"]
}
```

#### App/Service Configuration (`apps/*/tsconfig.json`)

NoEmit with local path mappings:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true,
    "paths": {
      "~/*": ["./app/*"]
    }
  }
}
```

### Module Resolution

- **Development**: Bun resolves `@hominem/*` packages to source files for instant updates
- **Production**: Package.json exports point to built `.d.ts` and `.js` files

## Compiler and Build Optimizations

### Incremental Builds

- `composite: true` enables per-package incremental compilation
- `tsBuildInfoFile` locations specified for apps
- Turbo orchestrates builds in dependency order
- No cross-package type checking during build

### Memory and Performance Settings

- `skipLibCheck: true` avoids type-checking node_modules
- Narrow `include`/`exclude` patterns reduce file watching
- Clean `.tsbuildinfo` files force fresh incremental state

## VS Code and tsserver Optimizations

### Settings (`.vscode/settings.json`)

```json
{
  "typescript.tsserver.maxTsServerMemory": 8192,
  "typescript.tsserver.experimental.enableProjectDiagnostics": false,
  "typescript.disableAutomaticTypeAcquisition": true,
  "typescript.tsserver.watchOptions": {
    "watchFile": "useFsEvents",
    "watchDirectory": "useFsEvents",
    "fallbackPolling": "dynamicPriority"
  },
  "files.watcherExclude": {
    "**/.git/objects/**": true,
    "**/.git/submodules/**": true,
    "**/node_modules/**": true,
    "**/build/**": true,
    "**/.next/**": true,
    "**/dist/**": true
  }
}
```

### Expected Improvements

- Memory: 50–70% reduction in tsserver memory pressure
- Incremental build latency: 30–40% faster
- File watchers: 50–70% fewer watchers
- Editor responsiveness: Lower autocomplete latency, fewer crashes

## Type-Level Performance Optimizations

### tRPC Router Optimizations

#### Granular Type Exports

- Per-feature router types instead of monolithic `AppRouterInputs/Outputs`
- Direct procedure type access for maximum performance

Performance benchmarks:

- Full App Router: ~10,000 instantiations
- Per-Feature Router: ~2,000 (80% faster)
- Direct Procedure: ~50 (90% faster)

#### Schema Simplification

- Extract input schemas to separate files
- Use consistent array types (e.g., `sortBy: string[]` instead of unions)
- Add explicit output type annotations to break inference chains

#### Migration Pattern

```typescript
// Before (slow)
import type { AppRouterOutputs } from '@hominem/trpc';
type Data = AppRouterOutputs['finance']['transactions']['list'];

// After (fast)
import type { TransactionListOutput } from '@hominem/trpc/router-types';
type Data = TransactionListOutput;
```

### Database Schema Optimizations

#### Drizzle ORM Relations

- Define only commonly queried relations to reduce complexity
- Export explicit query result types

```typescript
export type TransactionWithAccount = typeof transactions.$inferSelect & {
  account: typeof financeAccounts.$inferSelect;
};
```

#### Nested Schema Extraction

- Break deeply nested Zod schemas into separate variables
- Reduces nesting levels and inference complexity

### Centralized Type Infrastructure

#### Shared Utilities (`packages/hono-rpc/src/types/utils.ts`)

- `JsonSerialized<T>`: Converts Date fields to ISO strings (single source of truth)
- `EmptyInput`: Semantic type for no-input endpoints

#### Output Type Inference

- Use `InferResponseType` from Hono to derive outputs directly from route handlers
- Avoids manual type definitions and ensures sync with implementations

### Common Optimization Patterns

#### Extract Named Types

```typescript
// Before (high instantiations)
type UpdateData = Partial<Pick<Omit<Required<User>, 'id'>, 'name' | 'email'>>;

// After (low instantiations)
type UserWithoutId = Omit<User, 'id'>;
type RequiredUser = Required<UserWithoutId>;
type EditableFields = Pick<RequiredUser, 'name' | 'email'>;
type UpdateData = Partial<EditableFields>;
```

#### Simplify Union Types

```typescript
// Before
type Status = 'pending' | 'approved' | 'rejected' | /* 50 more */;

// After
const STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
} as const;
type Status = (typeof STATUS)[keyof typeof STATUS];
```

#### Add Explicit Annotations

```typescript
// Before (relies on inference)
export const router = {
  list: procedure.input(schema).query(async ({ input }) => {
    return await queryTransactions(input);
  }),
};

// After (breaks inference chain)
type TransactionListOutput = QueryTransactionsOutput;
export const router = {
  list: procedure.input(schema).query(async ({ input }): Promise<TransactionListOutput> => {
    return await queryTransactions(input);
  }),
};
```

## Performance Monitoring and Testing

### @ark/attest for Type Instantiation Tracking

Tracks TypeScript's type-checking performance by counting instantiations.

#### Writing Tests

For database schemas:

```typescript
import { attest } from '@ark/attest';
import type { MyTable } from './schema';

it('should efficiently infer table type', () => {
  attest(() => {
    type Test = MyTable;
  }).type.instantiations.lessThan(100);
});
```

For tRPC routers:

```typescript
import { attest } from '@ark/attest';
import type { inferRouterInputs } from '@trpc/server';
import type { myRouter } from './router';

type RouterInputs = inferRouterInputs<typeof myRouter>;

it('should efficiently infer router inputs', () => {
  attest(() => {
    type Test = RouterInputs;
  }).type.instantiations.lessThan(1000);
});
```

#### Thresholds

- Simple types: < 100 instantiations
- Schema types: < 500 instantiations
- Router procedures: < 1,000 instantiations
- Complete routers: < 5,000 instantiations

### TypeScript Trace Analysis

Generates comprehensive performance reports:

```bash
bun run analyze:type-perf
```

Shows slowest type checks and files with highest instantiations.

### CI Integration

Type performance tests run automatically in GitHub Actions to prevent regressions.

## Development Workflow

### Commands

```bash
# Install dependencies
bun install

# Development
bun run dev

# Build
bun run build --force

# Test
bun run test --force

# Type check
bun run typecheck

# Performance analysis
bun run analyze:type-perf

# Type performance tests
bun run test:type-perf

# Update snapshots
bun run test:type-perf:update
```

### Best Practices

- Use source files for instant updates in development
- Run `bun run build --force` after config changes
- Monitor performance monthly with `bun run analyze:type-perf`
- Add tests for new complex types
- Gradually migrate to optimized patterns

## Troubleshooting

### Slow IDE Performance

- Check for high instantiation files with `bun run analyze:type-perf`
- Optimize types using patterns above
- Restart TypeScript server: Cmd+Shift+P → "TypeScript: Restart TS Server"

### Memory Issues

- Increase `typescript.tsserver.maxTsServerMemory` in VS Code settings
- Split very large packages into smaller ones
- Reduce type-level complexity

### Build Failures

- Clean `.tsbuildinfo` files: `find . -name "*.tsbuildinfo" -delete`
- Rebuild: `bun run build --force`
- Check for circular dependencies

### Type Errors

- Ensure package.json exports match actual files
- Verify Bun workspace configuration
- Restart editor or LSP client

## Migration and Maintenance

### Phase Approach

1. **Immediate**: Use per-feature types in new code
2. **Short-term**: Update frequently-used components to direct procedure types
3. **Long-term**: Gradually migrate remaining code

### Monitoring

- Run `bun run analyze:type-perf` monthly
- Review performance quarterly as codebase grows
- CI prevents regressions automatically

## Performance Targets

| Metric                 | Target            | Status |
| ---------------------- | ----------------- | ------ |
| Initial load time      | ~10–20s           | ✅     |
| Incremental compile    | ~2–3s             | ✅     |
| tsserver memory        | 2–3GB             | ✅     |
| File watchers          | 800–1000          | ✅     |
| Type-check time (TRPC) | <10s              | ✅     |
| Type instantiations    | <5,000 per router | ✅     |

## Conclusion

The Hominem monorepo's TypeScript optimizations create a fast, reliable development environment through architectural choices, compiler settings, IDE configurations, and targeted type improvements. The Internal Packages pattern with Bun workspace resolution provides instant updates, while granular type exports and performance monitoring prevent slowdowns. This setup scales well and maintains high productivity as the codebase grows.

For detailed implementation, refer to the individual documentation files in `docs/` or run the analysis tools to monitor performance.
