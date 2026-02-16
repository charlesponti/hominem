---
title: Create Unified Environment Package with Explicit Client/Server Env
type: feat
date: 2026-02-15
---

# Create Unified Environment Package with Explicit Client/Server Env

## Overview

Create a unified `@hominem/env` package that provides explicit `clientEnv` (using `import.meta.env`) and `serverEnv` (using `process.env`) exports to prevent SSR environment variable issues. This package will centralize all environment variable handling across the monorepo, providing type safety, validation, and clear separation between client and server contexts.

## Problem Statement

Currently, environment variables are accessed inconsistently across the codebase:
- **Client components** use `import.meta.env.VITE_*` (Vite's compile-time replacement)
- **Server loaders** use `process.env` (Node.js runtime)
- **Shared code** often uses fallbacks like `import.meta.env.X || process.env.X`

This leads to the production bug where SSR loaders fall back to `http://localhost:4040` because `import.meta.env` is not available during server-side rendering, causing API calls to fail silently.

### Current Pain Points

1. **Silent failures in production** - Missing env vars default to localhost
2. **Inconsistent patterns** - Each app has its own env handling
3. **No type safety** - Direct env access bypasses validation
4. **Security risk** - Server vars can accidentally leak to client bundles
5. **Developer confusion** - Unclear when to use which pattern

## Proposed Solution

Create a single `@hominem/env` package with **shared base schemas only**. Apps extend these with their own app-specific variables.

### Architecture

**Shared Package** (`@hominem/env`) - Infrastructure only:
- `baseClientSchema` - API_URL, SUPABASE_URL, etc.
- `baseServerSchema` - DATABASE_URL, service keys, etc.

**Apps** - Extend with app-specific variables:
```typescript
// apps/rocco/app/lib/env.ts
import { baseClientSchema } from '@hominem/env/schema';

export const clientSchema = baseClientSchema.extend({
  VITE_GOOGLE_API_KEY: z.string(),
});
```

### Package Structure

```
packages/env/
├── src/
│   ├── schema/
│   │   ├── base.ts          # Shared variables only
│   │   └── index.ts         # Re-exports
│   ├── client.ts            # baseClientEnv export
│   ├── server.ts            # baseServerEnv export
│   └── types.ts             # TypeScript type exports
├── tests/
│   └── schema.test.ts       # Base schema tests
├── package.json
├── tsconfig.json
└── README.md
```

### Variable Naming Convention

| Context | Prefix | Example |
|---------|--------|---------|
| Client (browser) | `VITE_` | `VITE_PUBLIC_API_URL` |
| Server (Node.js) | No prefix | `PUBLIC_API_URL` |

**Rationale:** Vite requires `VITE_` prefix for client-side env vars. Server vars should not have this prefix to make it obvious they are server-only.

## Technical Approach

### 1. Schema Design

**Base Schema (shared):**
```typescript
// packages/env/src/schema/base.ts
export const baseClientSchema = z.object({
  VITE_PUBLIC_API_URL: z.string().url(),
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string(),
});

export const baseServerSchema = z.object({
  PUBLIC_API_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  DATABASE_URL: z.string().url(),
  // ... other server-only vars
});
```

**App-Specific Schema (example: rocco):**
```typescript
// packages/env/src/schema/apps/rocco.ts
export const roccoClientSchema = baseClientSchema.extend({
  VITE_APP_BASE_URL: z.string().url(),
  VITE_GOOGLE_API_KEY: z.string(),
});

export const roccoServerSchema = baseServerSchema.extend({
  GOOGLE_API_KEY: z.string(),
});
```

### 2. Client Environment (`client.ts`)

```typescript
// packages/env/src/client.ts
import { baseClientSchema } from './schema';

function createClientEnv() {
  if (typeof window === 'undefined' || typeof import.meta === 'undefined') {
    throw new Error(
      'clientEnv can only be used in browser/client context. ' +
      'Use serverEnv for server-side code.'
    );
  }
  return baseClientSchema.parse(import.meta.env);
}

export const baseClientEnv = createClientEnv();
export { baseClientSchema } from './schema';
```

### 3. Server Environment (`server.ts`)

```typescript
// packages/env/src/server.ts
import { baseServerSchema } from './schema';

function createServerEnv() {
  if (typeof process === 'undefined') {
    throw new Error(
      'serverEnv can only be used in Node.js/server context. ' +
      'Use clientEnv for browser/client code.'
    );
  }
  return baseServerSchema.parse(process.env);
}

export const baseServerEnv = createServerEnv();
export { baseServerSchema } from './schema';
```

### 4. Package.json Exports

```json
{
  "exports": {
    "./client": {
      "types": "./dist/client.d.ts",
      "default": "./dist/client.js"
    },
    "./server": {
      "types": "./dist/server.d.ts",
      "default": "./dist/server.js"
    },
    "./schema": {
      "types": "./dist/schema/index.d.ts",
      "default": "./dist/schema/index.js"
    },
    "./package.json": "./package.json"
  }
}
```

## Usage Patterns

### Pattern 1: Use Base Env (Simple Cases)

For code that only needs shared infrastructure variables:

```typescript
// Client (Browser)
import { baseClientEnv } from '@hominem/env/client';
const apiUrl = baseClientEnv.VITE_PUBLIC_API_URL;

// Server (SSR)
import { baseServerEnv } from '@hominem/env/server';
const apiUrl = baseServerEnv.PUBLIC_API_URL;
```

### Pattern 2: Extend in Your App (Recommended)

Create app-specific env that extends the base:

```typescript
// apps/rocco/app/lib/env.ts
import { baseClientSchema, baseServerSchema } from '@hominem/env/schema';
import { z } from 'zod';

const roccoClientSchema = baseClientSchema.extend({
  VITE_APP_BASE_URL: z.string().url(),
  VITE_GOOGLE_API_KEY: z.string(),
});

const roccoServerSchema = baseServerSchema.extend({
  GOOGLE_API_KEY: z.string().optional(),
});

export const clientEnv = roccoClientSchema.parse(import.meta.env);
export const serverEnv = roccoServerSchema.parse(process.env);
```

Then use in your app:

```typescript
// apps/rocco/app/components/MyComponent.tsx
import { clientEnv } from '~/lib/env';
const apiUrl = clientEnv.VITE_PUBLIC_API_URL;
const googleKey = clientEnv.VITE_GOOGLE_API_KEY;
```

### Pattern 3: Shared Utilities (Explicit Context)

```typescript
// packages/utils/api.ts
import { baseClientEnv } from '@hominem/env/client';
import { baseServerEnv } from '@hominem/env/server';

// Accept env as parameter
type ApiConfig = { apiUrl: string; supabaseUrl: string };

// Client usage
const client = createApiClient({
  apiUrl: baseClientEnv.VITE_PUBLIC_API_URL,
  supabaseUrl: baseClientEnv.VITE_SUPABASE_URL,
});

// Server usage  
const client = createApiClient({
  apiUrl: baseServerEnv.PUBLIC_API_URL,
  supabaseUrl: baseServerEnv.SUPABASE_URL,
});
```

## Migration Path

### Phase 1: Package Creation (This Plan)
1. Create `@hominem/env` package with schemas
2. Set up validation and exports
3. Write comprehensive documentation
4. Add unit tests

### Phase 2: App Migration (Gradual)

Each app creates its own env file extending the base schemas:

**apps/rocco:**
1. Create `app/lib/env.ts` extending base schemas
2. Replace direct `import.meta.env` usage → `clientEnv`
3. Replace direct `process.env` usage → `serverEnv`
4. Update imports across the app

**apps/notes:**
- Same pattern as rocco

**apps/finance:**
- Same pattern as rocco

**services/api:**
- Can use `baseServerEnv` directly (no app-specific vars needed)
- Or extend if service-specific vars required

### Phase 3: Enforcement
1. Add Oxlint rule to warn on direct `process.env`/`import.meta.env` access
2. Update CI to fail on new direct env usage
3. Gradually migrate remaining files

## Acceptance Criteria

### Functional Requirements

- [x] `@hominem/env` package created and published
- [x] `clientEnv` export validates and exposes VITE_* variables
- [x] `serverEnv` export validates and exposes non-VITE variables
- [x] Clear error messages when env is missing or invalid
- [x] TypeScript types properly exported
- [ ] All apps migrated to use the package (Phase 2 - pending)
- [ ] No direct `process.env` or `import.meta.env` usage in new code (Phase 3 - pending)

### Non-Functional Requirements

- [ ] Server variables cannot be imported in client bundles (tree-shaking test)
- [ ] Validation errors clearly indicate which variable is missing
- [ ] Package has <1KB runtime overhead
- [ ] Build-time validation option available

### Quality Gates

- [ ] Unit tests for all schema validations
- [ ] Integration test for SSR scenarios
- [ ] Tree-shaking test to verify server vars don't leak
- [ ] All existing tests pass after migration
- [ ] Documentation complete with examples

## Technical Considerations

### Security

**Server Variable Protection:**
- Separate entry points (`/client` vs `/server`) enable tree-shaking
- Build test verifies server code is not in client bundle
- Runtime error if `serverEnv` is accessed in browser

**Validation:**
- Zod schemas prevent malformed URLs or missing vars
- Lazy validation on first access (not import) prevents startup crashes

### Performance

- Lazy validation only runs once on first access
- No runtime overhead after initial validation
- Tree-shaking removes unused exports

### Error Handling

**Missing Variable:**
```
Error: Environment validation failed
  Variable: PUBLIC_API_URL
  Issue: Required
  Context: serverEnv
```

**Wrong Context:**
```
Error: clientEnv can only be used in browser/client context.
Use serverEnv for server-side code.
```

**Invalid Format:**
```
Error: Environment validation failed
  Variable: VITE_PUBLIC_API_URL
  Issue: Invalid url
  Received: "not-a-url"
```

## Dependencies & Risks

### Dependencies

1. **zod** - Already used across codebase
2. **TypeScript** - Already configured
3. **Bun** - For package building

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing env access | High | Gradual migration with lint warnings first |
| Server vars leak to client | Critical | Tree-shaking test in CI, separate entry points |
| Validation crashes app startup | Medium | Lazy validation on first access, not import |
| Schema conflicts between apps | Low | App-specific schemas with base inheritance |
| Build configuration issues | Low | Clear documentation, example configs |

## Implementation Phases

### Phase 1: Foundation (2-3 hours)
1. Create package structure
2. Define base schemas
3. Implement client.ts and server.ts
4. Add basic tests

### Phase 2: App Integration (4-6 hours)
1. Migrate apps/rocco
2. Migrate apps/notes
3. Migrate apps/finance
4. Migrate services/api

### Phase 3: Tooling & Polish (2-3 hours)
1. Add Oxlint rule
2. Write comprehensive documentation
3. Add tree-shaking test
4. Final review and cleanup

## References & Research

### Internal References

- **Current env handling:**
  - `apps/rocco/app/lib/env.ts` - Current merged env pattern
  - `apps/rocco/app/lib/api.server.ts` - Dual-support pattern (the bug source)
  - `services/api/src/env.ts` - Server env with Proxy pattern
  
- **Files requiring migration:**
  - `apps/*/app/lib/env.ts` (3 files)
  - `apps/*/app/lib/api.server.ts` (3 files)
  - `apps/*/app/lib/api/provider.tsx` (3 files)
  - `packages/ui/src/hooks/use-api-client.ts`
  - Multiple components with direct `import.meta.env` access

### Related Issues

- Production bug: SSR loaders redirecting to 404 due to localhost fallback
- Related to: Type optimization migration (different domains for app vs API)

### External References

- [Vite Env Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Zod Documentation](https://zod.dev/)
- [Tree Shaking Best Practices](https://webpack.js.org/guides/tree-shaking/)

## Notes

### Key Design Decisions

1. **Shared base only** - Package only contains infrastructure/common variables
2. **Apps extend** - Each app creates its own env.ts extending base schemas
3. **Separate entry points** (`/client`, `/server`) prevent accidental imports
4. **Explicit exports** - `baseClientEnv` and `baseServerEnv` for clarity
5. **Lazy validation** - Prevents import-time crashes
6. **VITE_ prefix for client** - Maintains Vite compatibility

### Why This Architecture?

**Before (centralized app schemas):**
- ❌ Package had to know about every app's variables
- ❌ Adding a var required updating shared package
- ❌ App-specific concerns leaked into shared code

**After (decentralized):**
- ✅ Shared package only knows about infrastructure
- ✅ Apps own their specific variables
- ✅ Changes to one app don't affect others
- ✅ Shared schemas are reusable building blocks

### Migration Notes

- Keep existing `.env` files unchanged
- Both `VITE_PUBLIC_API_URL` and `PUBLIC_API_URL` needed during migration
- Gradual adoption prevents breaking changes
- Oxlint rule will guide developers to new pattern

### Future Considerations

- Consider build-time validation Vite plugin
- Possible dev tools integration for env inspection
- Schema versioning for breaking changes
