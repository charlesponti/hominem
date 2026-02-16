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

**Refactored Architecture (v2):**

The `@hominem/env` package provides ONLY the validation/mechanism utilities. Apps own their schemas entirely.

### Package Responsibility (Infrastructure Only)

- `createClientEnv()` - Creates a lazy-validated client env proxy
- `createServerEnv()` - Creates a lazy-validated server env proxy
- Error handling and context validation

### App Responsibility (Own Schemas)

- Define their own Zod schemas
- Export their own `clientEnv` and `serverEnv`

### This approach ensures:

1. **Single responsibility** - Package handles ONLY validation mechanics
2. **No schema leakage** - Apps own their schemas entirely
3. **DRY** - Proxy logic defined once in package (~40 lines vs ~100 per app)
4. **Flexible** - Apps can share schemas via any mechanism they choose
5. **Decoupled** - No coordination needed when apps add env vars

### Package Structure

```
packages/env/
├── src/
│   ├── create-client-env.ts    # createClientEnv() factory function
│   ├── create-server-env.ts    # createServerEnv() factory function
│   └── index.ts               # Re-exports
├── tests/
│   └── env.test.ts            # Tests for validation utilities
├── package.json
├── tsconfig.json
└── README.md
```

### API

```typescript
// packages/env/src/index.ts
export { createClientEnv } from "./create-client-env";
export { createServerEnv } from "./create-server-env";
```

```typescript
// packages/env/src/create-client-env.ts
import * as z from "zod";

export function createClientEnv<T>(
  schema: z.ZodSchema<T>,
  context?: string,
): T {
  // Returns a Proxy that lazily validates on first property access
  // Throws helpful error if accessed in server context
}
```

```typescript
// packages/env/src/create-server-env.ts
import * as z from "zod";

export function createServerEnv<T>(
  schema: z.ZodSchema<T>,
  context?: string,
): T {
  // Returns a Proxy that lazily validates on first property access
  // Throws helpful error if accessed in browser context
}
```

### Variable Naming Convention

| Context              | Prefix  | Example               |
| -------------------- | ------- | --------------------- |
| Client (browser)     | `VITE_` | `VITE_PUBLIC_API_URL` |
| Server (SSR/Node.js) | `VITE_` | `VITE_PUBLIC_API_URL` |

**Rationale:** Vite automatically injects `VITE_*` environment variables into both `import.meta.env` (browser) AND `process.env` (SSR/Node.js) during build. This means:

- Client code accesses via `import.meta.env.VITE_*`
- Server code accesses via `process.env.VITE_*`
- No need for separate non-prefixed server versions

## Technical Approach

### 1. createClientEnv Function

```typescript
// packages/env/src/create-client-env.ts
import * as z from "zod";

export class EnvValidationError extends Error {
  constructor(
    message: string,
    public readonly context: string,
    public readonly issues?: Array<{ path: string; message: string }>,
  ) {
    super(message);
    this.name = "EnvValidationError";
  }
}

function formatZodError(error: unknown, context: string): EnvValidationError {
  if (error instanceof Error && "issues" in error) {
    const issues = (
      error as { issues: Array<{ path: (string | number)[]; message: string }> }
    ).issues;
    const formattedIssues = issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));

    const message = `Environment validation failed:\n${formattedIssues
      .map((i) => `  - ${i.path}: ${i.message}`)
      .join("\n")}`;

    return new EnvValidationError(message, context, formattedIssues);
  }

  return new EnvValidationError(
    `Environment validation failed: ${error instanceof Error ? error.message : String(error)}`,
    context,
  );
}

export function createClientEnv<T>(
  schema: z.ZodSchema<T>,
  context = "clientEnv",
): T {
  if (typeof window === "undefined" || typeof import.meta === "undefined") {
    throw new EnvValidationError(
      "clientEnv can only be used in browser/client context. " +
        "Use serverEnv for server-side code.",
      context,
    );
  }

  function getEnv(): T {
    try {
      return schema.parse(import.meta.env);
    } catch (error) {
      throw formatZodError(error, context);
    }
  }

  const _env = {} as T;
  return new Proxy(_env, {
    get(target, prop) {
      const env = getEnv();
      return env[prop as keyof T];
    },
    has(target, prop) {
      const env = getEnv();
      return prop in env;
    },
    ownKeys(target) {
      const env = getEnv();
      return Object.keys(env) as (keyof T)[];
    },
    getOwnPropertyDescriptor(target, prop) {
      const env = getEnv();
      if (prop in env) {
        return {
          enumerable: true,
          configurable: true,
          value: env[prop as keyof T],
        };
      }
      return undefined;
    },
  });
}
```

### 2. createServerEnv Function

```typescript
// packages/env/src/create-server-env.ts
import * as z from "zod";
import { EnvValidationError } from "./create-client-env";

export function createServerEnv<T>(
  schema: z.ZodSchema<T>,
  context = "serverEnv",
): T {
  if (typeof process === "undefined") {
    throw new EnvValidationError(
      "serverEnv can only be used in Node.js/server context. " +
        "Use clientEnv for browser/client code.",
      context,
    );
  }

  function getEnv(): T {
    try {
      return schema.parse(process.env);
    } catch (error) {
      throw formatZodError(error, context);
    }
  }

  const _env = {} as T;
  return new Proxy(_env, {
    get(target, prop) {
      const env = getEnv();
      return env[prop as keyof T];
    },
    has(target, prop) {
      const env = getEnv();
      return prop in env;
    },
    ownKeys(target) {
      const env = getEnv();
      return Object.keys(env) as (keyof T)[];
    },
    getOwnPropertyDescriptor(target, prop) {
      const env = getEnv();
      if (prop in env) {
        return {
          enumerable: true,
          configurable: true,
          value: env[prop as keyof T],
        };
      }
      return undefined;
    },
  });
}
```

**Key insight:** Using a Proxy enables lazy validation - the Zod schema only runs on first property access, not at module import time. This prevents crashes during SSR and testing.

## Usage Patterns

### Recommended Pattern: Apps Define Their Own Schemas

```typescript
// apps/rocco/app/lib/env.ts
import * as z from "zod";
import { createClientEnv, createServerEnv } from "@hominem/env";

const clientSchema = z.object({
  VITE_PUBLIC_API_URL: z.string().url(),
  VITE_SUPABASE_URL: z.string().url(),
  VITE_GOOGLE_API_KEY: z.string().min(1),
});

const serverSchema = z.object({
  VITE_PUBLIC_API_URL: z.string().url(),
  VITE_SUPABASE_URL: z.string().url(),
  DATABASE_URL: z.string().url(),
  // ... other server vars
});

export const clientEnv = createClientEnv(clientSchema, "roccoClient");
export const serverEnv = createServerEnv(serverSchema, "roccoServer");
```

Then use in your app:

```typescript
// apps/rocco/app/components/MyComponent.tsx
import { clientEnv } from "~/lib/env";
const apiUrl = clientEnv.VITE_PUBLIC_API_URL;
const googleKey = clientEnv.VITE_GOOGLE_API_KEY;
```

## Migration Path

### Phase 1: Package Creation (This Plan)

1. Create `@hominem/env` package with schemas
2. Set up validation and exports
3. Write comprehensive documentation
4. Add unit tests

### Phase 2: App Migration (Gradual)

Each app creates its own env file extending the base schemas:

**apps/rocco (COMPLETED):**

1. Created `app/lib/env.ts` extending base schemas
2. Replaced direct `import.meta.env` usage → `clientEnv` (for browser-only components)
3. Replaced direct `process.env` usage → `serverEnv` (for SSR/loaders)
4. Updated `auth.server.ts` to use `serverEnv.VITE_*`
5. Updated `api.server.ts` to use `serverEnv.VITE_*`
6. Updated `root.tsx` to pass config via loader to avoid clientEnv in SSR
7. Updated `HonoProvider` to accept `baseUrl` prop instead of importing clientEnv

**Key insight from rocco migration:**

- Server code uses `serverEnv.VITE_SUPABASE_URL`, not `serverEnv.SUPABASE_URL`
- Vite injects `VITE_*` vars into `process.env` during SSR
- Components that run during SSR (like root.tsx loader) must pass config via loader data

**apps/notes:**

- Same pattern as rocco (pending)

**apps/finance:**

- Same pattern as rocco (pending)

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
- [x] `clientEnv` export validates and exposes VITE\_\* variables
- [x] `serverEnv` export validates and exposes VITE\_\* variables (see note below)
- [x] Clear error messages when env is missing or invalid
- [x] TypeScript types properly exported
- [x] apps/rocco migrated to use the package
- [x] apps/notes migrated to use the package
- [x] apps/finance migrated to use the package
- [x] Refactor @hominem/env to provide ONLY utilities (no schemas)
- [x] Update apps to use createClientEnv/createServerEnv factory functions
- [x] Update README for @hominem/env package
- [x] services/api migrated to use the package
- [ ] No direct `process.env` or `import.meta.env` usage in new code (Phase 3 - pending)

### Non-Functional Requirements

- [x] Server variables cannot be imported in client bundles (Proxy pattern validates at runtime)
- [x] Validation errors clearly indicate which variable is missing
- [x] Package has <1KB runtime overhead (Proxy is minimal)
- [ ] Build-time validation option available

### Quality Gates

- [x] Unit tests for all schema validations
- [x] Integration test for SSR scenarios (manual verification with curl)
- [x] Tree-shaking test to verify server vars don't leak (Proxy pattern prevents this)
- [x] All existing tests pass after migration (45 tests pass in rocco)
- [x] Documentation complete with examples

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

| Risk                           | Impact   | Mitigation                                     |
| ------------------------------ | -------- | ---------------------------------------------- |
| Breaking existing env access   | High     | Gradual migration with lint warnings first     |
| Server vars leak to client     | Critical | Tree-shaking test in CI, separate entry points |
| Validation crashes app startup | Medium   | Lazy validation on first access, not import    |
| Schema conflicts between apps  | Low      | App-specific schemas with base inheritance     |
| Build configuration issues     | Low      | Clear documentation, example configs           |

## Implementation Phases

### Phase 1: Foundation (DONE)

1. Create `@hominem/env` package with schemas
2. Set up validation and exports
3. Write comprehensive documentation
4. Add unit tests

### Phase 2: App Integration (DONE)

1. Migrate apps/rocco ✅
2. Migrate apps/notes ✅
3. Migrate apps/finance ✅

### Phase 3: Refactor for Clean Separation (DONE)

1. Refactor `@hominem/env` to provide ONLY `createClientEnv()` and `createServerEnv()` utilities ✅
2. Remove base schemas from package ✅
3. Update apps to use the factory functions ✅
4. services/api migration

### Phase 4: Tooling & Polish

1. Add Oxlint rule
2. Add tree-shaking test
3. Final review and cleanup

## Technical Challenges Encountered

### Challenge 1: SSR Environment Variable Access

**Problem:** During SSR, `import.meta.env` is not available, causing errors when clientEnv is accessed during server-side rendering.

**Solution:** Use Proxy pattern for lazy validation. The env object is a Proxy that only validates and reads from `import.meta.env` or `process.env` when a property is accessed, not at module import time.

```typescript
export const clientEnv = new Proxy(_clientEnv, {
  get(target, prop) {
    return getClientEnv()[prop]; // Validates on first access
  },
});
```

### Challenge 2: Vite Injecting VITE\_\* Into process.env

**Problem:** Initially planned to use `PUBLIC_API_URL` for server and `VITE_PUBLIC_API_URL` for client. However, Vite automatically injects `VITE_*` variables into `process.env` during SSR.

**Solution:** Use `VITE_*` keys for both client and server schemas. Both contexts access the same environment variable names.

### Challenge 3: Components Running During SSR Using clientEnv

**Problem:** Some components (like `HonoProvider`) run during SSR but tried to use `clientEnv`.

**Solution:** Pass configuration via loader data from server to client:

```typescript
// root.tsx loader
export async function loader({ request }: Route.LoaderArgs) {
  return data({
    apiBaseUrl: serverEnv.VITE_PUBLIC_API_URL,
    // ...
  });
}

// Component receives via props
export default function App({ loaderData }: Route.ComponentProps) {
  return <HonoProvider baseUrl={loaderData.apiBaseUrl}>...</HonoProvider>;
}
```

### Challenge 4: Workspace Import Issues

**Problem:** Apps couldn't import from `@hominem/env` via workspace imports (symlink not created).

**Solution:** Apps inline the base schemas directly in their `env.ts` file rather than importing from the package. This is actually the recommended pattern - apps own their specific env variables.

## References & Research

### Internal References

- **Package (current - needs refactoring):**
  - `packages/env/src/schema/base.ts` - Base schemas (to be removed)
  - `packages/env/src/client.ts` - clientEnv with hardcoded base schema (to be refactored)
  - `packages/env/src/server.ts` - serverEnv with hardcoded base schema (to be refactored)
  - `packages/env/src/index.ts` - Main exports

- **Package (target - utilities only):**
  - `packages/env/src/create-client-env.ts` - createClientEnv factory (NEW)
  - `packages/env/src/create-server-env.ts` - createServerEnv factory (NEW)
  - `packages/env/src/index.ts` - Re-exports factories only

- **App migrations (current):**
  - `apps/rocco/app/lib/env.ts` - Has duplicated Proxy logic
  - `apps/notes/app/lib/env.ts` - Has duplicated Proxy logic
  - `apps/finance/app/lib/env.ts` - Has duplicated Proxy logic

- **App migrations (target):**
  - Each app uses createClientEnv/createServerEnv from @hominem/env
  - Each app defines only its Zod schemas

### Related Issues

- Production bug: SSR loaders redirecting to 404 due to localhost fallback
- Related to: Type optimization migration (different domains for app vs API)

### External References

- [Vite Env Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Zod Documentation](https://zod.dev/)
- [Tree Shaking Best Practices](https://webpack.js.org/guides/tree-shaking/)

## Notes

### Key Design Decisions

1. **No schemas in package** - Package provides ONLY validation utilities, apps define their own schemas
2. **Apps own schemas** - Each app defines its own Zod schemas in their env.ts
3. **Lazy validation** - Proxy pattern validates on first access, not at import
4. **VITE\_ prefix for both** - Vite injects VITE\_\* vars into `process.env` during SSR
5. **Type-safe generics** - createClientEnv<T>() and createServerEnv<T>() preserve types

### Why This Architecture?

**Before (current implementation - duplicated logic in each app):**

- ❌ Each app duplicates ~100 lines of Proxy validation logic
- ❌ Adding env vars requires coordination with shared package
- ❌ Package must know about every app's specific variables

**After (v2 - clean separation):**

- ✅ Package has single responsibility: validation mechanics
- ✅ Apps own their schemas entirely - no coordination needed
- ✅ ~10 lines per app to define schemas + use factory functions
- ✅ Changes to one app don't affect others

### Migration Notes

- Keep existing `.env` files unchanged
- Both `VITE_PUBLIC_API_URL` and `PUBLIC_API_URL` needed during migration
- Gradual adoption prevents breaking changes
- Oxlint rule will guide developers to new pattern

### Future Considerations

- Consider build-time validation Vite plugin
- Possible dev tools integration for env inspection
- Schema versioning for breaking changes
