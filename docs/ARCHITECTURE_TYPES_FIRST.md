# Types-First RPC Architecture: Optimizing for Maximum TypeScript Performance

## Executive Summary

This document outlines a comprehensive refactor of the Hominem monorepo's type architecture to achieve **sub-second type checking** across all applications. The current architecture relies on TypeScript inferring API shapes from runtime code, creating expensive recursive type computations. The proposed architecture **inverts this relationship**, making types the source of truth and routing code consume them.

**Current Performance:** 17.79s (rocco), 16.99s (finance), 15.40s (notes)  
**Target Performance:** <1s per app

---

## Part 1: The Problem

### Current Architecture (Inverted)

```
┌─────────────────────────────────────────────────────────┐
│ Database Schemas (Zod)                                  │
│ └─ 100+ fields across tables                            │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│ Route Handlers (23 route files, 6162 lines)            │
│ └─ Each handler chains: Zod → validation → response    │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│ app.ts (the bottleneck)                                │
│ ├─ Combines all 23 route files into one Hono app       │
│ └─ Hono applies route handlers to create app type      │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼ (EXPENSIVE typeof app)
┌─────────────────────────────────────────────────────────┐
│ AppType = typeof app                                    │
│ ├─ TypeScript must evaluate: route structure            │
│ ├─ response types, handler signatures, all chain types  │
│ └─ Recursively computed: 15,979ms (hono-rpc/app.ts)    │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│ Apps (rocco, notes, finance)                           │
│ ├─ Import AppType                                       │
│ ├─ TypeScript re-computes app shape 3x independently    │
│ ├─ rocco: 17.79s, notes: 15.40s, finance: 16.99s       │
│ └─ hono-client also computes: 13.87s                    │
└─────────────────────────────────────────────────────────┘

Total time wasted: 15.98s + 17.79s + 15.40s + 16.99s + 13.87s = 79.03s
```

### Why This Is Slow

1. **Recursive Type Evaluation**: TypeScript must infer the entire app structure from route handlers
   - Each handler's return type depends on previous handlers
   - Hono's type system chains handlers, creating deep nesting
   - `typeof app` forces full evaluation of this chain

2. **Redundant Computation**: Each app independently re-infers AppType
   - rocco infers → notes infers → finance infers → hono-client infers
   - Same type computed 4+ times
   - No caching across projects

3. **Module Boundary Violation**: Type computation crosses monorepo boundaries
   - rocco's tsconfig includes app/ only
   - But TypeScript still loads hono-rpc/src/app.ts to resolve `typeof app`
   - This triggers parsing of 23 route files for each app

4. **No Explicit Contracts**: Apps don't know what types exist
   - Must reverse-engineer from app shape
   - Encourages "unsafe" typing patterns
   - No centralized type documentation

---

## Part 2: The Solution - Types-First Architecture

### Inverted Design: Types Lead, Routes Follow

```
┌─────────────────────────────────────────────────────────┐
│ Database Schemas (Zod)                                  │
│ └─ Single source of truth for validation rules          │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│ Domain Types (NEW - types-first)                        │
│ ├─ places.types.ts       ← PlaceCreateInput/Output      │
│ ├─ finance.types.ts      ← Transaction*, Account* types │
│ ├─ invites.types.ts      ← InvitesSent, InvitesReceived │
│ └─ [20 other domains]                                   │
│                                                          │
│ Properties:                                             │
│ ├─ EXPLICIT, not inferred (z.infer<> or manual)        │
│ ├─ Single computation per type                          │
│ ├─ Zero re-computation across monorepo                  │
│ └─ Fully importable by any app                          │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
┌──────────────┐ ┌─────────────┐ ┌─────────────┐
│ Route Files  │ │ Apps (rocco)│ │ Clients     │
│ (consume)    │ │ (consume)   │ │ (consume)   │
│              │ │             │ │             │
│ places.ts    │ │ import type │ │ hc<AppType> │
│ ├─ uses      │ │ from types  │ │ doesn't     │
│ │ Place*Type │ │             │ │ need AppType│
│ └─ returns   │ │ type safe   │ │             │
│   explicit   │ │ without     │ │ just uses   │
│   types      │ │ inference   │ │ types       │
└──────────────┘ └─────────────┘ └─────────────┘
        │              │              │
        └──────────────┼──────────────┘
                       ▼
┌─────────────────────────────────────────────────────────┐
│ app.ts (lightweight)                                    │
│ ├─ Just combines routes                                 │
│ ├─ No type inference needed                             │
│ └─ typeof app works instantly (no computation)          │
└─────────────────────────────────────────────────────────┘

Total time: types computed once, referenced everywhere
```

### Key Principles

1. **Explicit Over Inferred**: Types are written explicitly, never derived from code
2. **Single Computation**: Each type is computed exactly once at declaration
3. **Published Contracts**: Types are the public API of hono-rpc
4. **Decoupled Consumers**: Apps/clients never depend on app.ts
5. **Parallel Type Checking**: Each app loads only the types it needs

---

## Part 3: Detailed Architecture

### Directory Structure (Post-Refactor)

```
packages/hono-rpc/
├── src/
│   ├── types/                           ← NEW: Central type definitions
│   │   ├── index.ts                     (exports all types)
│   │   ├── utils.ts                     (shared type utilities)
│   │   ├── errors.ts                    (ApiError, ErrorResponse)
│   │   │
│   │   ├── admin.types.ts
│   │   ├── bookmarks.types.ts
│   │   ├── chats.types.ts
│   │   ├── finance.types.ts
│   │   │   ├── exports: TransactionListInput, TransactionListOutput
│   │   │   ├── exports: AccountListInput, AccountListOutput
│   │   │   ├── exports: BudgetCreateInput, BudgetCreateOutput
│   │   │   └── [40+ finance-specific types]
│   │   ├── invites.types.ts
│   │   ├── items.types.ts
│   │   ├── lists.types.ts
│   │   ├── places.types.ts
│   │   │   ├── exports: PlaceCreateInput, PlaceCreateOutput
│   │   │   ├── exports: PlaceUpdateInput, PlaceUpdateOutput
│   │   │   ├── exports: PlaceAutocompleteInput, PlaceAutocompleteOutput
│   │   │   └── [20+ place-specific types]
│   │   ├── people.types.ts
│   │   ├── trips.types.ts
│   │   └── user.types.ts
│   │
│   ├── routes/                          (consume types, no inference)
│   │   ├── admin.ts
│   │   ├── bookmarks.ts
│   │   ├── chats.ts
│   │   ├── finance/                     (organized by complexity)
│   │   │   ├── accounts.ts              (uses AccountListInput/Output)
│   │   │   ├── transactions.ts          (uses TransactionListInput/Output)
│   │   │   ├── budget.ts                (uses BudgetCreateInput/Output)
│   │   │   └── analyze.ts               (uses AnalyzeInput/Output)
│   │   ├── invites.ts
│   │   ├── items.ts
│   │   ├── lists.ts
│   │   ├── places.ts
│   │   ├── people.ts
│   │   ├── trips.ts
│   │   └── user.ts
│   │
│   ├── middleware/                      (auth, validation, etc.)
│   │   └── auth.ts
│   │
│   ├── app.ts                           (lightweight, just plumbing)
│   ├── index.ts                         (exports app + types)
│   └── build.ts                         (type declaration generation)
│
└── package.json

apps/rocco/
└── app/
    ├── lib/hooks/
    │   ├── use-places.ts                (imports PlaceCreateOutput, NOT AppType)
    │   ├── use-lists.ts                 (imports ListCreateOutput, NOT AppType)
    │   └── use-finance.ts               (imports Transaction*, Account* types)
    └── ...
```

### Type Definition Pattern

Each domain type file follows this pattern:

#### Example: `packages/hono-rpc/src/types/places.types.ts`

```typescript
/**
 * Places Domain Types
 * 
 * Single source of truth for all place-related API contracts.
 * These types are:
 * - Explicit (not inferred from code)
 * - Computed once, referenced everywhere
 * - Safe to import directly by apps and clients
 */

import { z } from 'zod';
import type { PlaceSelect } from '@hominem/db/schema';
import type { ApiResult } from '@hominem/services';

// ============================================================================
// CREATE PLACE
// ============================================================================

/** Input: Data required to create a new place */
export type PlaceCreateInput = {
  name: string;
  googleId: string;
  location: {
    lat: number;
    lng: number;
  };
  address?: string;
  notes?: string;
};

export const placeCreateInputSchema = z.object({
  name: z.string().min(1),
  googleId: z.string(),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  address: z.string().optional(),
  notes: z.string().optional(),
});

/** Output: Response after successfully creating a place */
export type PlaceCreateOutput = ApiResult<{
  id: string;
  name: string;
  googleId: string;
  location: { lat: number; lng: number };
  address: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}>;

// ============================================================================
// UPDATE PLACE
// ============================================================================

export type PlaceUpdateInput = {
  id: string;
  name?: string;
  notes?: string;
};

export const placeUpdateInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  notes: z.string().optional(),
});

export type PlaceUpdateOutput = ApiResult<{
  id: string;
  name: string;
  googleId: string;
  location: { lat: number; lng: number };
  address: string | null;
  notes: string | null;
  updatedAt: string;
}>;

// ============================================================================
// DELETE PLACE
// ============================================================================

export type PlaceDeleteInput = { id: string };
export const placeDeleteInputSchema = z.object({ id: z.string() });
export type PlaceDeleteOutput = ApiResult<{ success: boolean }>;

// ============================================================================
// GET PLACE
// ============================================================================

export type PlaceGetDetailsInput = { id: string };
export type PlaceGetDetailsOutput = ApiResult<{
  id: string;
  name: string;
  googleId: string;
  location: { lat: number; lng: number };
  address: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  // ... other fields
}>;

// ============================================================================
// AUTOCOMPLETE
// ============================================================================

export type PlaceAutocompleteInput = {
  query: string;
  location?: { lat: number; lng: number };
  radius?: number;
};

export type PlaceAutocompleteOutput = ApiResult<Array<{
  placeId: string;
  description: string;
  mainText: string;
  secondaryText?: string;
  location: { lat: number; lng: number };
}>>;

// ... [20+ more place-specific types]
```

### Route Implementation Pattern

Routes **consume** explicit types, no inference:

#### Example: `packages/hono-rpc/src/routes/places.ts`

```typescript
/**
 * Places Routes
 * 
 * All types are imported from types/places.types.ts
 * This route file focuses on handler logic, not type inference.
 */

import { Hono } from 'hono';
import type { AppContext } from '../middleware/auth';
import { placeService } from '@hominem/services';
import {
  // Input types & validators
  type PlaceCreateInput,
  placeCreateInputSchema,
  type PlaceUpdateInput,
  placeUpdateInputSchema,
  type PlaceDeleteInput,
  placeDeleteInputSchema,
  type PlaceAutocompleteInput,
  // Output types
  type PlaceCreateOutput,
  type PlaceUpdateOutput,
  type PlaceDeleteOutput,
  type PlaceGetDetailsOutput,
  type PlaceAutocompleteOutput,
} from '../types/places.types';

export const placesRoutes = new Hono<AppContext>()
  
  // ============================================================================
  // POST /create - Create a new place
  // ============================================================================
  .post('/create', async (c) => {
    const input = await c.req.json<PlaceCreateInput>();
    
    // Validate using schema
    const parsed = placeCreateInputSchema.safeParse(input);
    if (!parsed.success) {
      return c.json<PlaceCreateOutput>(
        { success: false, error: 'Invalid input', details: parsed.error },
        400
      );
    }

    try {
      const place = await placeService.create(parsed.data);
      return c.json<PlaceCreateOutput>({
        success: true,
        data: {
          id: place.id,
          name: place.name,
          googleId: place.googleId,
          location: { lat: place.lat, lng: place.lng },
          address: place.address,
          notes: place.notes,
          createdAt: place.createdAt.toISOString(),
          updatedAt: place.updatedAt.toISOString(),
        },
      });
    } catch (error) {
      return c.json<PlaceCreateOutput>(
        { success: false, error: 'Failed to create place' },
        500
      );
    }
  })

  // ============================================================================
  // PATCH /update - Update an existing place
  // ============================================================================
  .patch('/update', async (c) => {
    const input = await c.req.json<PlaceUpdateInput>();
    const parsed = placeUpdateInputSchema.safeParse(input);
    
    if (!parsed.success) {
      return c.json<PlaceUpdateOutput>(
        { success: false, error: 'Invalid input' },
        400
      );
    }

    try {
      const place = await placeService.update(parsed.data.id, parsed.data);
      return c.json<PlaceUpdateOutput>({
        success: true,
        data: {
          id: place.id,
          name: place.name,
          googleId: place.googleId,
          location: { lat: place.lat, lng: place.lng },
          address: place.address,
          notes: place.notes,
          updatedAt: place.updatedAt.toISOString(),
        },
      });
    } catch (error) {
      return c.json<PlaceUpdateOutput>(
        { success: false, error: 'Failed to update place' },
        500
      );
    }
  })

  // DELETE, GET, AUTOCOMPLETE... same pattern
  .delete('/delete', async (c) => {
    const { id } = await c.req.json<PlaceDeleteInput>();
    const parsed = placeDeleteInputSchema.safeParse({ id });
    
    if (!parsed.success) {
      return c.json<PlaceDeleteOutput>(
        { success: false, error: 'Invalid input' },
        400
      );
    }

    try {
      await placeService.delete(id);
      return c.json<PlaceDeleteOutput>({ success: true, data: { success: true } });
    } catch (error) {
      return c.json<PlaceDeleteOutput>(
        { success: false, error: 'Failed to delete place' },
        500
      );
    }
  });
```

**Key observation**: The route file never uses `typeof placeService` or infers types. Everything is explicit.

### Application Usage (No Inference)

#### Example: `apps/rocco/app/lib/hooks/use-places.ts`

```typescript
/**
 * React hooks for Places API
 * 
 * Imports types directly from @hominem/hono-rpc/types
 * Zero type inference needed - types are explicit contracts
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '../api-client';
import type {
  PlaceCreateInput,
  PlaceCreateOutput,
  PlaceUpdateInput,
  PlaceUpdateOutput,
  PlaceAutocompleteInput,
  PlaceAutocompleteOutput,
} from '@hominem/hono-rpc/types';

/**
 * Create a new place
 * 
 * Type-safe: PlaceCreateInput ensures correct parameters
 *            PlaceCreateOutput ensures correct response
 */
export function usePlaceCreate() {
  return useMutation<PlaceCreateOutput, Error, PlaceCreateInput>({
    mutationFn: async (input) => {
      const res = await apiClient.api.places.create.$post({
        json: input,
      });
      return res.json();
    },
  });
}

/**
 * Update a place
 */
export function usePlaceUpdate() {
  return useMutation<PlaceUpdateOutput, Error, PlaceUpdateInput>({
    mutationFn: async (input) => {
      const res = await apiClient.api.places.update.$patch({
        json: input,
      });
      return res.json();
    },
  });
}

/**
 * Autocomplete places
 */
export function usePlaceAutocomplete() {
  return useQuery<PlaceAutocompleteOutput, Error, PlaceAutocompleteOutput>(
    {
      queryKey: ['places', 'autocomplete'],
      queryFn: async () => {
        // implementation
      },
    }
  );
}
```

**This is what rocco's type checking sees:**
- Plain type imports (instant resolution)
- No computation needed
- No `AppType` inference
- Result: <0.1s per hook file

---

## Part 4: Implementation Plan

### Phase 1: Type Extraction (Week 1)

Extract explicit types for each domain. Go through each route file and:

1. **Identify all input/output types** in the route handlers
2. **Write explicit type definitions** in `types/{domain}.types.ts`
3. **Create Zod schemas** for runtime validation
4. **Export both types and schemas**

Example checklist for `places.types.ts`:
- [ ] PlaceCreateInput, PlaceCreateOutput
- [ ] PlaceUpdateInput, PlaceUpdateOutput
- [ ] PlaceDeleteInput, PlaceDeleteOutput
- [ ] PlaceGetInput, PlaceGetOutput
- [ ] PlaceAutocompleteInput, PlaceAutocompleteOutput
- [ ] PlaceNearbyInput, PlaceNearbyOutput
- [ ] PlaceVisitInput, PlaceVisitOutput
- [ ] [All 20+ place operations]

### Phase 2: Route Refactoring (Week 2)

Update each route file to consume explicit types:

```diff
- import { placeService } from '@hominem/services';
+ import {
+   type PlaceCreateInput,
+   placeCreateInputSchema,
+   type PlaceCreateOutput,
+ } from '../types/places.types';
+ import { placeService } from '@hominem/services';

- .post('/create', async (c) => {
-   const input = await c.req.json();
-   // ... handler
-   return c.json({ success: true, data: place });
- })

+ .post('/create', async (c) => {
+   const input = await c.req.json<PlaceCreateInput>();
+   const parsed = placeCreateInputSchema.safeParse(input);
+   if (!parsed.success) {
+     return c.json<PlaceCreateOutput>(
+       { success: false, error: 'Invalid input' },
+       400
+     );
+   }
+   // ... handler
+   return c.json<PlaceCreateOutput>({ success: true, data: place });
+ })
```

For each of 23 routes, update to consume types. No `typeof` needed.

### Phase 3: Index Updates (Week 2)

Update export paths:

**Old `packages/hono-rpc/src/index.ts`:**
```typescript
export { app };
export type { AppType } from './app';
```

**New `packages/hono-rpc/src/index.ts`:**
```typescript
// Runtime exports
export { app };

// Type exports - this is the public API
export * from './types';
```

### Phase 4: Application Updates (Week 3)

Update all apps to import types directly:

**Old `apps/rocco/app/lib/hooks/use-places.ts`:**
```typescript
import type { AppType } from '@hominem/hono-rpc';
// ... infer types from AppType
```

**New `apps/rocco/app/lib/hooks/use-places.ts`:**
```typescript
import type {
  PlaceCreateInput,
  PlaceCreateOutput,
} from '@hominem/hono-rpc/types';
// ... use explicit types
```

Affected files:
- [ ] apps/rocco/**/*.ts
- [ ] apps/notes/**/*.ts
- [ ] apps/finance/**/*.ts
- [ ] packages/hono-client/**/*.ts
- [ ] tools/cli/**/*.ts

### Phase 5: Client Updates (Week 3)

Simplify hono-client to never need `AppType`:

```typescript
// OLD: packages/hono-client/src/core/client.ts
import type { AppType } from '@hominem/hono-rpc';
export class HonoClient {
  private client: ReturnType<typeof hc<AppType>>;
}

// NEW: packages/hono-client/src/core/client.ts
import type { app } from '@hominem/hono-rpc';
export class HonoClient {
  private client: ReturnType<typeof hc<typeof app>>;
  // (no inference needed - typeof app is instant with explicit route types)
}
```

### Phase 6: Cleanup (Week 4)

- [ ] Remove `app.type.ts` (no longer needed)
- [ ] Remove `types-only.ts` (types are in `/types`)
- [ ] Delete unused `lib/typed-routes.ts`
- [ ] Update documentation
- [ ] Remove temporary performance workarounds
- [ ] Run full type-audit - expect <0.5s per app

---

## Part 5: Performance Predictions

### Current State
```
apps/rocco:        17.79s (90% computing app type)
apps/notes:        15.40s
apps/finance:      16.99s
packages/hono-rpc: 11.62s
packages/hono-client: 13.87s
────────────────────────
TOTAL:            75.67s
```

### After Phase 1-6 (Types-First Architecture)

```
apps/rocco:        0.2s (type imports only)
apps/notes:        0.2s
apps/finance:      0.2s
packages/hono-rpc: 0.5s (types definition + lightweight app.ts)
packages/hono-client: 0.3s (receives explicit types)
────────────────────────
TOTAL:            1.4s  ← 98% improvement
```

### Why Such Massive Improvement?

1. **Zero Type Inference**: Types are written, not computed
2. **No Recursive Evaluation**: No `typeof app` chain
3. **Parallel Loading**: Each app loads only its imports
4. **Cached Type Definitions**: Types computed once, cached forever
5. **Instant Module Resolution**: No deep dependency traversal

---

## Part 6: Benefits Beyond Performance

### 1. Type Clarity
**Before**: Types hidden in handler implementations  
**After**: Types are **documented contracts** in dedicated files
```typescript
// Before: Have to read the route handler to understand the API
// After: Look at types/places.types.ts - all API contracts visible
```

### 2. API Documentation Automation
Types become your API specification:
```typescript
// Can auto-generate OpenAPI/GraphQL schema from types
// Can generate client SDKs in other languages
// Can generate interactive docs
```

### 3. Breaking Changes Detection
```typescript
// Adding a new required field to PlaceCreateInput?
// Type checker will instantly flag all code using the old signature
// Much easier to track API changes
```

### 4. Testing
```typescript
// Test suite can import types to verify handler behavior
import type { PlaceCreateOutput } from '@hominem/hono-rpc/types';

test('create place returns correct shape', () => {
  const output: PlaceCreateOutput = { ... };
  // Compile-time guarantee this matches API
});
```

### 5. Client-Side Safety
```typescript
// React components can use types directly
const [place, setPlace] = useState<PlaceCreateOutput | null>(null);
// Type-safe without ever importing AppType
```

---

## Part 7: Migration Path (No Downtime)

The refactor can be **incremental and non-blocking**:

### Step 1: Add new types in parallel
```
Keep existing: packages/hono-rpc/src/routes/places.ts (old)
Add alongside:  packages/hono-rpc/src/types/places.types.ts (new)
```

### Step 2: Dual export
```typescript
// packages/hono-rpc/src/index.ts
export type { AppType } from './app.type'; // Old way (deprecated)
export * from './types';                   // New way (preferred)
```

### Step 3: Update apps one by one
```typescript
// Old (still works): import type { AppType } from '@hominem/hono-rpc';
// New (encouraged): import type { PlaceCreateOutput } from '@hominem/hono-rpc/types';
```

### Step 4: Deprecate AppType
Once all apps updated, mark `AppType` as deprecated in the export:

```typescript
/**
 * @deprecated Use explicit domain types from '@hominem/hono-rpc/types' instead
 * 
 * Example:
 *   OLD: import type { AppType } from '@hominem/hono-rpc'
 *   NEW: import type { PlaceCreateOutput } from '@hominem/hono-rpc/types'
 */
export type AppType = typeof app;
```

---

## Part 8: Tooling & Automation

### Type Synchronization Script

Create `scripts/sync-types.ts` to ensure types stay in sync:

```typescript
/**
 * Validates that exported types match actual route handlers
 */
import { execSync } from 'child_process';
import { describe, it, expect } from 'vitest';
import type { AppType } from '../packages/hono-rpc/src/types/index';
import { app } from '../packages/hono-rpc/src/app';

describe('Type Synchronization', () => {
  it('Places types match app routes', () => {
    // Extract places route from app
    const placesRoute = app.routes.api.places;
    
    // Verify all endpoints in types/places.types.ts exist in routes/places.ts
    const expectedEndpoints = [
      'create', 'update', 'delete', 'get', 'autocomplete', 'nearby'
    ];
    
    expectedEndpoints.forEach(endpoint => {
      expect(placesRoute[endpoint]).toBeDefined();
    });
  });
});
```

### Type Coverage Report

Add to `type-audit` script:

```bash
$ bun run type-audit --coverage

Places:     18/18 types exported ✅
Finance:    42/42 types exported ✅
Invites:    12/12 types exported ✅
[...]

All 340 API endpoints have explicit types: ✅
```

---

## Part 9: FAQ

### Q: Will this require breaking changes for users of hono-rpc?

**A:** No! The refactor is backward compatible:
- Old way (importing AppType) still works
- New way (importing explicit types) is now preferred
- Deprecation period before removal

### Q: What about types that genuinely need inference?

**A:** Very few. 99% of API types can be written explicitly:
- Input types: struct of fields (explicit)
- Output types: struct of fields (explicit)
- Only truly dynamic types (like union responses) might benefit from inference

### Q: How do we handle types that depend on other types?

**A:** Import and compose:
```typescript
// types/finance.types.ts
import type { Transaction, Account } from './shared.types';

export type FinanceListOutput = ApiResult<{
  transactions: Transaction[];
  accounts: Account[];
}>;
```

### Q: What about RPC methods that have many overloads?

**A:** Create explicit overload types:
```typescript
// types/places.types.ts
export type PlaceGetInput = 
  | { id: string }
  | { googleId: string }
  | { name: string; location: [number, number] };

export type PlaceGetOutput = ApiResult<Place>;
```

### Q: How do we test that apps are correctly typed?

**A:** TypeScript tests with @ark/attest:
```typescript
import type { PlaceCreateOutput } from '@hominem/hono-rpc/types';

attest((x: PlaceCreateOutput) => {
  // Should resolve in <100 instantiations
  x.data?.id;
}).type.instantiations.lessThan(100);
```

---

## Part 10: Timeline & Effort

| Phase | Task | Duration | Owner | Status |
|-------|------|----------|-------|--------|
| 1 | Extract places.types.ts | 2h | — | Planned |
| 1 | Extract finance.types.ts | 4h | — | Planned |
| 1 | Extract all remaining types | 8h | — | Planned |
| 2 | Refactor places routes | 2h | — | Planned |
| 2 | Refactor finance routes | 4h | — | Planned |
| 2 | Refactor all remaining routes | 4h | — | Planned |
| 3 | Update hono-rpc index.ts | 0.5h | — | Planned |
| 4 | Update rocco app imports | 2h | — | Planned |
| 4 | Update notes app imports | 2h | — | Planned |
| 4 | Update finance app imports | 2h | — | Planned |
| 5 | Update hono-client | 1h | — | Planned |
| 6 | Cleanup & final audit | 1h | — | Planned |
| — | **TOTAL** | **~33 hours** | — | — |

**Total effort: ~1 week (distributed)**

---

## Part 11: Success Metrics

After implementation, verify:

```bash
# 1. Type audit < 1 second per app
$ bun run type-audit
apps/rocco:        0.18s ✅
apps/notes:        0.21s ✅
apps/finance:      0.19s ✅

# 2. No unnecessary type computation
$ bun run type-audit --trace
rocco: checkExpression: 3ms (vs 17,790ms before)

# 3. IDE response time < 100ms
# (measured via VS Code performance monitor)

# 4. Type safety maintained
$ bun run type-check
0 errors ✅

# 5. All tests pass
$ bun run test
✅ 2,400+ tests passing
```

---

## Part 12: Rollout Plan

### Phase A: Internal Team (Days 1-3)
1. Implement types for single domain (places)
2. Verify rocco type-checks in <0.5s
3. Verify IDE performance improvement
4. Document process

### Phase B: Full Implementation (Days 4-7)
1. Extract types for all domains
2. Update all route files
3. Update all apps simultaneously
4. Run full test suite

### Phase C: Deprecation (Week 2+)
1. Mark old patterns as deprecated
2. Update documentation
3. Provide migration guide
4. Gather feedback

---

## Conclusion

This architecture shift transforms TypeScript from a **performance bottleneck** to a **competitive advantage**:

- **Performance**: 75s → 1.4s (98% improvement)
- **Clarity**: Types become the public API
- **Scalability**: Adding new routes doesn't slow type checking
- **Maintainability**: Types are centralized and versioned
- **Safety**: Explicit contracts prevent bugs

The key insight: **Types shouldn't be computed, they should be composed.** Make types the source of truth, and everything else becomes fast.

---

## References

- [TypeScript Performance Best Practices](https://www.typescriptlang.org/docs/handbook/performance.html)
- [Hono Type System](https://hono.dev/top-level-api/hono-base)
- [Monorepo TypeScript Patterns](https://nx.dev/packages/ts)
- [Current Trace Analysis](../docs/PERFORMANCE_ANALYSIS.md)
