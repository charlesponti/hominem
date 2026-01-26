# RPC-Derived Types Implementation

## Overview

This document summarizes the implementation of RPC-derived types across the Hominem monorepo. All type definitions for Hono RPC endpoints are now automatically derived from Zod validation schemas, eliminating the risk of type drift between client and server.

## Problem Statement

Previously, type definitions were manually maintained in separate files:

- Input types defined in `*.types.ts` files
- Validation schemas defined in route files
- **Risk**: Types could drift from schemas, causing runtime errors

Example of the old pattern:

```typescript
// packages/hono-rpc/src/types/places.types.ts
export interface PlaceCreateInput {
  name: string;
  description?: string;
  googleMapsId: string;
}

// packages/hono-rpc/src/routes/places.ts
const placeCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  googleMapsId: z.string(),
  // If schema changes, types above become stale!
});
```

## Solution

### 1. Export Zod Schemas from Routes

All route files now export their validation schemas:

```typescript
// packages/hono-rpc/src/routes/places.ts
export {
  placeCreateSchema,
  placeUpdateSchema,
  placeDeleteSchema,
  // ... etc
};
```

### 2. Derive Input Types from Schemas

Input types are now inferred directly from Zod schemas using `z.infer<>`:

```typescript
// packages/hono-rpc/src/types/places.types.ts
import { placeCreateSchema } from '../routes/places';

// Automatically derived - stays in sync with schema
export type PlaceCreateInput = z.infer<typeof placeCreateSchema>;
```

### 3. Maintain Output Types as Data Structures

Output types represent the actual data returned by handlers, not duplicating schemas:

```typescript
// Data structure returned by the create handler
export type PlaceCreateOutput = JsonSerialized<Place>;
```

### 4. Remove Type Assertions from Hooks

All hook functions no longer need type assertions since types are inferred:

```typescript
// Before
return res.json() as Promise<ApiResult<PlaceCreateOutput>>;

// After - types are inferred from RPC client
return res.json();
```

## Files Modified

### Type Files Updated

- `packages/hono-rpc/src/types/places.types.ts` ✅
- `packages/hono-rpc/src/types/lists.types.ts` ✅
- `packages/hono-rpc/src/types/invites.types.ts` ✅
- `packages/hono-rpc/src/types/items.types.ts` ✅
- `packages/hono-rpc/src/types/finance.types.ts` ✅
- `packages/hono-rpc/src/types/user.types.ts` ✅
- `packages/hono-rpc/src/types/admin.types.ts` ✅
- `packages/hono-rpc/src/types/people.types.ts` ✅
- `packages/hono-rpc/src/types/trips.types.ts` ✅

### Route Files Updated (Schema Exports)

- `packages/hono-rpc/src/routes/places.ts` ✅
- `packages/hono-rpc/src/routes/lists.ts` ✅
- `packages/hono-rpc/src/routes/invites.ts` ✅
- `packages/hono-rpc/src/routes/items.ts` ✅
- `packages/hono-rpc/src/routes/finance.transactions.ts` ✅
- `packages/hono-rpc/src/routes/finance.accounts.ts` ✅
- `packages/hono-rpc/src/routes/people.ts` ✅
- `packages/hono-rpc/src/routes/trips.ts` ✅

### Hook Files Updated (Type Assertions Removed)

- `apps/rocco/app/lib/hooks/use-places.ts` ✅
- `apps/rocco/app/lib/hooks/use-lists.ts` ✅
- `apps/rocco/app/lib/hooks/use-items.ts` ✅
- `apps/rocco/app/lib/hooks/use-invites.ts` ✅

## Pattern Example: Places API

### 1. Define Zod Schema in Route

```typescript
// packages/hono-rpc/src/routes/places.ts
const placeCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  imageUrl: z.string().optional(),
  googleMapsId: z.string(),
  rating: z.number().optional(),
  types: z.array(z.string()).optional(),
  websiteUri: z.string().optional(),
  phoneNumber: z.string().optional(),
  photos: z.array(z.string()).optional(),
  listIds: z.array(z.uuid()).optional(),
});

// Export schema for type derivation
export { placeCreateSchema };
```

### 2. Derive Types in Type File

```typescript
// packages/hono-rpc/src/types/places.types.ts
import { z } from 'zod';
import { placeCreateSchema } from '../routes/places';

// Derived from Zod schema
export type PlaceCreateInput = z.infer<typeof placeCreateSchema>;

// Output type is the actual returned data
export type PlaceCreateOutput = JsonSerialized<Place>;
```

### 3. Use in Hooks Without Assertions

```typescript
// apps/rocco/app/lib/hooks/use-places.ts
export const useCreatePlace = (
  options?: HonoMutationOptions<ApiResult<PlaceCreateOutput>, PlaceCreateInput>,
) => {
  const utils = useHonoUtils();
  return useHonoMutation<ApiResult<PlaceCreateOutput>, PlaceCreateInput>(
    async (client: HonoClient, variables: PlaceCreateInput) => {
      const res = await client.api.places.create.$post({ json: variables });
      // No type assertion needed - types are fully inferred
      return res.json();
    },
    {
      onSuccess: (result, variables, context, mutationContext) => {
        if (result.success) {
          utils.invalidate(['places']);
        }
        options?.onSuccess?.(result, variables, context, mutationContext);
      },
      ...options,
    },
  );
};
```

## Benefits

### 1. Zero Type Drift Risk

- Input types automatically update when Zod schemas change
- Single source of truth: the Zod schema
- TypeScript compilation ensures consistency

### 2. Improved Maintainability

- One definition per operation (no duplicate schemas)
- Clear ownership: types live where validation happens
- Easier to review: schema and types in same location

### 3. Type Safety

- Full TypeScript coverage without manual maintenance
- Compile-time errors catch schema/type mismatches
- No runtime surprises from type divergence

### 4. Developer Experience

- Less boilerplate to write
- Automatic type inference
- IDE autocomplete works perfectly
- Refactoring schemas automatically updates client types

## Special Cases

### Endpoints with No Input

```typescript
// No input required for list endpoint
export type PeopleListInput = object;
export type PeopleListOutput = Person[];
```

### Endpoints with Service-Provided Schemas

For endpoints that use schemas from external services (e.g., `@hominem/lists-services`):

```typescript
import { sendListInviteSchema } from '@hominem/lists-services';

// Derived from service schema
export type InvitesCreateInput = z.infer<typeof sendListInviteSchema>;
export type InvitesCreateOutput = ListInvite;
```

### Nullable Outputs

When queries can return null:

```typescript
export const usePlaceById = (id: string | undefined) =>
  useHonoQuery<ApiResult<PlaceGetDetailsByIdOutput | null>>(
    ['places', 'get', id],
    async (client: HonoClient) => {
      if (!id) return { success: true, data: null };
      const res = await client.api.places.get.$post({ json: { id } });
      return res.json();
    },
    {
      enabled: !!id,
    },
  );
```

## Verification

All type files compile successfully:

```bash
bunx tsc -p packages/hono-rpc --noEmit
# ✅ No errors
```

## Migration Guide

If you need to add a new RPC endpoint:

1. **Define validation schema** in route file:

   ```typescript
   const myEndpointSchema = z.object({
     // ... fields
   });
   ```

2. **Export the schema**:

   ```typescript
   export { myEndpointSchema };
   ```

3. **Derive types** in type file:

   ```typescript
   export type MyEndpointInput = z.infer<typeof myEndpointSchema>;
   export type MyEndpointOutput = SomeDataType;
   ```

4. **Use in hooks** - no type assertions needed!

## Future Improvements

- Consider generating output types from handler return statements (advanced)
- Automate schema export generation
- Add linting rules to ensure all schemas are exported
- Document common type patterns in style guide
