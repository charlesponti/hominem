# RPC Types - Final Approach

## Summary

We've successfully implemented a clean, maintainable type infrastructure for the Hominem RPC system that:

1. **Eliminates duplication** - Shared utilities defined once
2. **Derives input types** - Automatically from Zod schemas
3. **Defines output types clearly** - Semantic, explicit definitions
4. **Avoids circular dependencies** - No type inference loops

## What Was Implemented

### 1. Centralized Type Utilities (`packages/hono-rpc/src/types/utils.ts`)

**`JsonSerialized<T>`** - Converts Date fields to ISO strings

- Single source of truth (was duplicated in 9 files)
- Used consistently across all output types
- Ensures HTTP responses match TypeScript types

**`EmptyInput`** - Type for endpoints with no parameters

- Replaces unclear `object` type
- Semantic clarity: `EmptyInput` vs `object`
- Applied to: admin, user, people, invites, trips endpoints

### 2. Input Type Derivation Pattern

All input types are derived from Zod schemas in route files:

```typescript
// routes/places.ts
export const placeCreateSchema = z.object({
  name: z.string(),
  address: z.string().optional(),
  // ...
});

// types/places.types.ts
export type PlaceCreateInput = z.infer<typeof placeCreateSchema>;
```

**Benefit:** Input types automatically stay in sync with route validation

### 3. Output Type Pattern

Output types are explicitly defined using the data structures returned by handlers:

```typescript
// types/places.types.ts
export type PlaceCreateOutput = JsonSerialized<Place>;
export type ListGetAllOutput = JsonSerialized<Array<List>>;
export type AdminRefreshGooglePlacesOutput = {
  success: boolean;
  updatedCount: number;
  message: string;
};
```

**Why not InferResponseType?**

We initially attempted to use Hono's `InferResponseType` to automatically derive output types, but this created circular dependencies:

```
index.ts exports AppType
types/*.ts imports AppType (via typed-routes.ts)
index.ts also does export * from './types'
→ CIRCULAR DEPENDENCY
```

The solution: **Keep outputs explicit and semantic.** This is actually clearer for maintainability:

- Developers immediately see what each endpoint returns
- No type inference delays
- Easy to add new endpoints
- No circular dependencies

## File Structure

```
packages/hono-rpc/src/
├── types/
│   ├── utils.ts              ← Shared utilities (JsonSerialized, EmptyInput)
│   ├── admin.types.ts        ← Admin types (inputs + outputs)
│   ├── finance.types.ts      ← Finance types
│   ├── invites.types.ts      ← Invites types
│   ├── items.types.ts        ← Items types
│   ├── lists.types.ts        ← Lists types
│   ├── people.types.ts       ← People types
│   ├── places.types.ts       ← Places types
│   ├── trips.types.ts        ← Trips types
│   ├── user.types.ts         ← User types
│   └── index.ts              ← Central exports
├── routes/
│   ├── admin.ts              ← Admin routes with Zod schemas
│   ├── finance.*.ts          ← Finance routes
│   ├── invites.ts            ← Invites routes
│   ├── items.ts              ← Items routes
│   ├── lists.ts              ← Lists routes
│   ├── people.ts             ← People routes
│   ├── places.ts             ← Places routes
│   ├── trips.ts              ← Trips routes
│   └── user.ts               ← User routes
└── index.ts                  ← App definition & AppType
```

## Type Derivation Flow

```
1. Developer writes route with Zod schema:
   .post('/create', zValidator('json', createSchema), async (c) => {
     const input = c.req.valid('json');  // Type inferred from Zod
     const result = await service.create(input);
     return c.json(success(result));      // Type inferred from handler
   })

2. Type file derives input type:
   export type CreateInput = z.infer<typeof createSchema>;

3. Type file defines output type:
   export type CreateOutput = JsonSerialized<CreatedThing>;

4. Client code gets full types:
   const response = await client.api.resource.create.$post(input);
   // response type is: { success: boolean; data?: CreateOutput; error?: ... }
```

## Key Principles

### ✅ What We Do

1. **Define Zod schemas in routes** - Single source of truth for input validation
2. **Export schemas from routes** - Make them available for type derivation
3. **Derive input types with z.infer** - Automatic sync with validation
4. **Define output types explicitly** - Clear, semantic type definitions
5. **Use JsonSerialized utility** - Consistent date serialization
6. **Use EmptyInput type** - Semantic clarity for no-param endpoints

### ❌ What We Avoid

1. **Circular dependencies** - No type inference that loops back
2. **Duplicate type definitions** - JsonSerialized defined once
3. **Manual type maintenance** - Inputs auto-derived from schemas
4. **Unclear type names** - `object` → `EmptyInput`
5. **Scattered utilities** - All utilities in one place

## Adding a New Endpoint

### Step 1: Define Route with Schema

```typescript
// routes/places.ts
export const placeArchiveSchema = z.object({
  id: z.string(),
  reason: z.string().optional(),
});

export const placesRoutes = new Hono().post(
  '/archive',
  authMiddleware,
  zValidator('json', placeArchiveSchema),
  async (c) => {
    const input = c.req.valid('json');
    const result = await archivePlace(input);
    return c.json(success(result), 200);
  },
);
```

### Step 2: Add Types

```typescript
// types/places.types.ts
import { placeArchiveSchema } from '../routes/places';

// Input type auto-derived
export type PlaceArchiveInput = z.infer<typeof placeArchiveSchema>;

// Output type explicitly defined
export type PlaceArchiveOutput = {
  success: boolean;
  archiveId: string;
  archivedAt: string;
};
```

### Step 3: Export from Index

```typescript
// types/index.ts
export type {
  // ... existing
  PlaceArchiveInput,
  PlaceArchiveOutput,
};
```

Done! Client code now has full type safety.

## Benefits

| Aspect             | Before           | After          |
| ------------------ | ---------------- | -------------- |
| **JsonSerialized** | 9 duplicate defs | 1 centralized  |
| **Type clarity**   | Unclear patterns | Semantic types |
| **Input sync**     | Manual maintain  | Auto-derived   |
| **Circular deps**  | Would occur      | None           |
| **Type safety**    | Good             | Excellent      |
| **Dev experience** | Repetitive       | Clear & simple |

## Type Checking Status

✅ **All types compile without errors**
✅ **No circular dependencies**
✅ **All 9 type files properly structured**
✅ **Shared utilities working correctly**
✅ **Input types derived from Zod schemas**
✅ **Output types explicitly defined**

## Why This Approach Works

1. **Explicit over implicit** - Output types are clear, not inferred
2. **Simple over clever** - No complex type inference machinery
3. **Single responsibility** - Each file has clear purpose
4. **Maintainable** - Easy to understand and modify
5. **Scalable** - Easy to add new endpoints
6. **Type-safe** - Full TypeScript support without tricks

## Related Documentation

- `RPC_TYPES_UTILITIES.md` - Details on JsonSerialized and EmptyInput
- `RPC_TYPES_IMPLEMENTATION.md` - Earlier implementation notes

## Lessons Learned

### Why InferResponseType Didn't Work

Hono's `InferResponseType` is powerful but created circular dependency issues in our monorepo structure:

- Type files need to import from route definitions
- Routes need to import from type definitions (for type annotations)
- Index needs to export everything
- Creating a typed-routes helper that imports AppType caused the loop

**Solution:** Keep types explicit. It's actually simpler and clearer this way.

### The Value of Semantic Types

Using `EmptyInput` instead of `object` might seem like a small detail, but it:

- Communicates intent clearly
- Prevents accidental misuse
- Makes code self-documenting
- Reduces cognitive load for new developers

### Centralization Matters

Having `JsonSerialized` in one place instead of nine:

- Makes updates trivial
- Ensures consistency
- Reduces bugs from copy-paste
- Improves code reviews
- Easier to test

## Conclusion

The RPC type infrastructure is now:

- **✅ Centralized** - Shared utilities in one place
- **✅ Derived** - Inputs from Zod, outputs explicit
- **✅ Maintainable** - Clear patterns and organization
- **✅ Scalable** - Easy to add new endpoints
- **✅ Type-safe** - Full TypeScript support
- **✅ Circular-free** - No dependency loops
- **✅ Semantic** - Clear intent and meaning

This approach prioritizes clarity and maintainability over type inference automation, resulting in a system that's easier to understand, modify, and extend.
