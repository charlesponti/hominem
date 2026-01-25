# RPC Types Utilities

## Overview

This document explains the centralized type utilities used across the Hominem RPC type system. These utilities eliminate duplication and ensure consistency across all API type definitions.

## Problem Statement

Previously, type definitions were scattered across multiple files with significant duplication:

1. **`JsonSerialized<T>` was defined in every type file** — This utility type converts Date fields to ISO string representations (matching HTTP JSON serialization), but it was redefined in `places.types.ts`, `lists.types.ts`, `invites.types.ts`, `finance.types.ts`, `items.types.ts`, `trips.types.ts`, and `people.types.ts`.

2. **No-input endpoints used `type SomeInput = object`** — This was semantically unclear and didn't follow the pattern of deriving types from Zod schemas. Examples:
   - `AdminRefreshGooglePlacesInput = object`
   - `InvitesGetSentInput = object`
   - `PeopleListInput = object`
   - `TripsGetAllInput = object`
   - `UserDeleteAccountInput = object`

## Solution

### 1. Centralized Utilities File

Created `packages/hono-rpc/src/types/utils.ts` with two core utilities:

#### `JsonSerialized<T>`

Converts all `Date` fields in a type to `string` recursively. This matches the reality of JSON serialization over HTTP.

```typescript
export type JsonSerialized<T> = T extends Date
  ? string
  : T extends Array<infer U>
    ? Array<JsonSerialized<U>>
    : T extends object
      ? { [K in keyof T]: JsonSerialized<T[K]> }
      : T;
```

**Usage:**

```typescript
import type { JsonSerialized } from './utils';

// If Place has createdAt: Date, output becomes createdAt: string
export type PlaceCreateOutput = JsonSerialized<Place>;
```

#### `EmptyInput`

Semantic type for endpoints that accept no input parameters. Replaces the unclear `object` type.

```typescript
export type EmptyInput = Record<string, never>;
```

**Usage:**

```typescript
import type { EmptyInput } from './utils';

export type AdminRefreshGooglePlacesInput = EmptyInput;
```

## Implementation Details

### Files Updated

All type definition files now import utilities from `utils.ts`:

- `admin.types.ts`
- `finance.types.ts`
- `invites.types.ts`
- `items.types.ts`
- `lists.types.ts`
- `people.types.ts`
- `places.types.ts`
- `trips.types.ts`
- `user.types.ts`

### Import Pattern

Use **type-only imports** due to TypeScript's `verbatimModuleSyntax` setting:

```typescript
import type { JsonSerialized, EmptyInput } from './utils';
```

### Examples of Changes

**Before:**

```typescript
// Duplicated in every file
type JsonSerialized<T> = T extends Date
  ? string
  : T extends Array<infer U>
    ? Array<JsonSerialized<U>>
    : T extends object
      ? { [K in keyof T]: JsonSerialized<T[K]> }
      : T;

export type AdminRefreshGooglePlacesInput = object;
export type InvitesGetSentInput = object;
```

**After:**

```typescript
import type { JsonSerialized, EmptyInput } from './utils';

export type AdminRefreshGooglePlacesInput = EmptyInput;
export type InvitesGetSentInput = EmptyInput;
```

## Benefits

1. **Single Source of Truth** — `JsonSerialized` and `EmptyInput` are defined once, making future updates simple.

2. **Semantic Clarity** — `EmptyInput` is more descriptive than `object` and signals intent to developers.

3. **Reduced Bundle Size** — Eliminates duplicate type definitions across files.

4. **Consistency** — All type files follow the same pattern for utilities.

5. **Maintainability** — Changes to serialization logic or empty-input semantics only need to be made in one place.

## Type Export in Index

The utilities are exported from `packages/hono-rpc/src/types/index.ts` for use in client code:

```typescript
export type { JsonSerialized, EmptyInput } from './utils';
```

This allows consumers to use these types consistently:

```typescript
import type { JsonSerialized, EmptyInput } from '@hominem/hono-rpc';
```

## Future Enhancements

### 1. Output Zod Schemas

For complete type derivation, consider adding output Zod schemas to routes:

```typescript
// In routes/places.ts
export const placeCreateOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(), // ISO string from serialization
});

// In types/places.types.ts
export type PlaceCreateOutput = z.infer<typeof placeCreateOutputSchema>;
```

### 2. Additional Utility Types

As the API grows, add utility types for common patterns:

```typescript
// Pagination wrapper
export type Paginated<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};

// API response with metadata
export type ApiMetadata = {
  timestamp: string;
  version: string;
  correlationId: string;
};
```

## Testing

Type checking passes with no errors:

```bash
bun run typecheck --filter @hominem/hono-rpc
```

All type derivations are validated at compile time, ensuring consistency between route validation schemas and client-side types.
