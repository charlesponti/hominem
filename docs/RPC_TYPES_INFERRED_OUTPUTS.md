# RPC Output Types Derived from Hono Routes

## Overview

Output types are now derived directly from Hono route handlers using `InferResponseType`, eliminating manual type definitions and ensuring API responses are always in sync with actual handler implementations.

## Architecture

### The Problem with Manual Output Types

Previously, output types were manually defined in `*types.ts` files:

```typescript
// Old approach - manual definition
export type PlaceCreateOutput = JsonSerialized<Place>;
export type ListGetAllOutput = Array<List>;
export type AdminRefreshGooglePlacesOutput = {
  success: boolean;
  updatedCount: number;
  message: string;
};
```

**Issues:**

- Types could drift from actual handler implementations
- Multiple sources of truth for the same data shape
- Maintenance burden: changes to handler responses required updating type files
- No guarantee that type definitions matched what the API actually returned

### The Solution: InferResponseType

Hono's `InferResponseType` utility automatically extracts response types from route handlers based on what's passed to `c.json()`.

```typescript
// New approach - inferred from route handlers
export type PlaceCreateOutput = ExtractResponse<GetEndpoint<AppType['api'], ['places', 'create']>>;
```

**Benefits:**

- Single source of truth: the actual route handler
- Automatic synchronization with API implementation
- Type-safe: TypeScript enforces matching inputs and outputs
- Zero maintenance: add a route, get its type automatically

## Implementation

### Step 1: Setup Type Inference Helper

File: `packages/hono-rpc/src/lib/typed-routes.ts`

This file defines:

1. **`ExtractResponse<T>`** - Extracts response type from `$post` or `$get` endpoint
2. **`GetEndpoint<App, Path>`** - Navigates the AppType to access specific endpoints
3. **All output types** - One per endpoint, derived automatically

```typescript
type ExtractResponse<Endpoint> = Endpoint extends { $post: infer Route }
  ? InferResponseType<Route>
  : Endpoint extends { $get: infer Route }
    ? InferResponseType<Route>
    : never;

type GetEndpoint<App, Path extends string[]> = Path extends [
  infer First extends string,
  ...infer Rest extends string[],
]
  ? First extends keyof App
    ? Rest extends []
      ? App[First]
      : GetEndpoint<App[First], Rest>
    : never
  : never;
```

**Key Design Decision:**

- Does NOT instantiate a Hono client (`hc<AppType>(...)`)
- Uses pure type helpers to navigate `AppType`
- Avoids circular dependency issues between routes and types

### Step 2: Import in Type Definition Files

Each `*types.ts` file imports inferred outputs from `typed-routes.ts`:

```typescript
// packages/hono-rpc/src/types/places.types.ts
import type {
  PlaceCreateOutput,
  PlaceUpdateOutput,
  // ... other outputs
} from '../lib/typed-routes';

// Inputs derived from Zod schemas (as before)
export type PlaceCreateInput = z.infer<typeof placeCreateSchema>;

// Outputs re-exported from typed-routes
export type { PlaceCreateOutput };
```

### Step 3: Routes Remain Unchanged

Route handlers continue working as before:

```typescript
.post('/create', authMiddleware, zValidator('json', placeCreateSchema), async (c) => {
  const input = c.req.valid('json');
  const place = await createOrUpdatePlace(input);

  // Type inference happens automatically from c.json() call
  return c.json(success(place), 201);
})
```

The response type is inferred from what you pass to `c.json()`. No type annotations needed in handlers.

## Type Derivation Flow

```
Route Handler                AppType (from Hono)
     ↓                              ↓
  c.json(data)  ←→  InferResponseType<typeof route.$post>
     ↓                              ↓
  Response Shape            Inferred Type
     ↓                              ↓
  ────────────────────────────────────
           typed-routes.ts
           (Extracts type)
                   ↓
           Output Type Export
                   ↓
           *types.ts files
           (Re-export)
                   ↓
           Client code uses
           type-safe responses
```

## Example: Complete Flow

### 1. Route Handler (places.ts)

```typescript
export const placesRoutes = new Hono<AppContext>().post(
  '/create',
  authMiddleware,
  zValidator('json', placeCreateSchema),
  async (c) => {
    const input = c.req.valid('json');
    const place = await createOrUpdatePlace(input);
    return c.json(success(place), 201);
  },
);
```

### 2. Type Inference (lib/typed-routes.ts)

```typescript
export type PlaceCreateOutput = ExtractResponse<GetEndpoint<AppType['api'], ['places', 'create']>>;

// TypeScript automatically infers:
// {
//   success: true;
//   data: Place;
// }
```

### 3. Type File (types/places.types.ts)

```typescript
import type { PlaceCreateOutput } from '../lib/typed-routes';

export type PlaceCreateInput = z.infer<typeof placeCreateSchema>;
export type { PlaceCreateOutput };
```

### 4. Client Usage (apps/rocco)

```typescript
const response = await client.api.places.create.$post({
  name: 'Coffee Shop',
  address: '123 Main St',
});

// response type is automatically:
// {
//   success: boolean;
//   data?: Place;
//   error?: { code: string; message: string };
// }

if (response.success) {
  console.log(response.data.id); // Type-safe!
}
```

## Advantages Over Previous Approaches

### vs. Manual Type Definitions

| Aspect           | Manual    | Inferred      |
| ---------------- | --------- | ------------- |
| Source of truth  | Type file | Route handler |
| Sync maintenance | Manual    | Automatic     |
| Drift risk       | High      | None          |
| Boilerplate      | High      | Low           |

### vs. Trying to Use `hc<AppType>()` in types

The original attempt to use `hc<AppType>()` to create a typed client caused circular dependencies:

```
routes/*.ts imports types → types import from typed-routes
→ typed-routes imports index (AppType) → index imports routes
→ CIRCULAR!
```

Our solution avoids this by using pure type helpers that don't instantiate the client.

## Adding a New Endpoint

When you add a new route:

1. **Define route with Zod schema:**

   ```typescript
   export const myNewSchema = z.object({ /* ... */ });

   .post('/my-new', authMiddleware, zValidator('json', myNewSchema), async (c) => {
     const result = { /* ... */ };
     return c.json(success(result), 200);
   })
   ```

2. **Export schema from routes file:**

   ```typescript
   export { myNewSchema };
   ```

3. **Add input type to types file:**

   ```typescript
   export type MyNewInput = z.infer<typeof myNewSchema>;
   ```

4. **Add output type to typed-routes.ts:**

   ```typescript
   export type MyNewOutput = ExtractResponse<GetEndpoint<AppType['api'], ['resource', 'my-new']>>;
   ```

5. **Export from types file:**

   ```typescript
   import type { MyNewOutput } from '../lib/typed-routes';
   export type { MyNewOutput };
   ```

6. **Client gets types automatically** - no further work needed!

## Current Status

✅ **Implemented:**

- Core type inference helper (`typed-routes.ts`)
- Output types for all existing endpoints
- Type files updated to import inferred outputs
- No circular dependencies

🔄 **Route files:**

- Continue to work as-is
- Can optionally remove output type annotations from variables (Hono infers them from `c.json()`)
- No changes required

## Future Enhancements

### 1. Generate typed-routes.ts Automatically

Create a code generator that:

- Scans route files for endpoints
- Extracts endpoint paths and HTTP methods
- Generates `typed-routes.ts` definitions

```bash
bun run generate:route-types
```

### 2. Validate Type Contracts

Add tests to ensure inferred types match actual handler responses:

```typescript
// route-contracts.test.ts
describe('PlaceCreateOutput', () => {
  it('matches actual handler response', async () => {
    const handler = placesRoutes.handler;
    const response = await handler(/* mock context */);
    const body = await response.json();

    // Validate body matches PlaceCreateOutput type
    validateType<PlaceCreateOutput>(body);
  });
});
```

### 3. LSP Integration

Enhance IDE support with:

- Auto-completion for endpoint paths
- Quick links from type to route handler
- Inline documentation in editors

## Troubleshooting

### Error: "Cannot find name 'MyEndpointOutput'"

**Cause:** Forgot to add the type to `typed-routes.ts`

**Solution:** Add the type definition following the pattern:

```typescript
export type MyEndpointOutput = ExtractResponse<
  GetEndpoint<AppType['api'], ['resource', 'endpoint']>
>;
```

### Circular dependency errors during type-checking

**Cause:** Route file importing output types from types file which imports from `typed-routes`

**Solution:** Remove output type imports from route files - Hono infers them from `c.json()` calls

### InferResponseType returns `unknown`

**Cause:** Response isn't being passed to `c.json()` with the right shape

**Solution:** Ensure you're calling `c.json(data)` where `data` matches your intended response shape

## Related Files

- `packages/hono-rpc/src/lib/typed-routes.ts` - Core type inference
- `packages/hono-rpc/src/types/*.types.ts` - Type re-exports
- `packages/hono-rpc/src/index.ts` - AppType definition
- `packages/hono-client/src/core/client.ts` - Client using inferred types

## See Also

- [RPC_TYPES_UTILITIES.md](RPC_TYPES_UTILITIES.md) - Shared type utilities
- [RPC_TYPES_IMPLEMENTATION.md](RPC_TYPES_IMPLEMENTATION.md) - Input type derivation from Zod
