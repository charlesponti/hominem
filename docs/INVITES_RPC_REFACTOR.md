# Invites RPC Refactor - Type Independence Implementation

## Overview

The invites RPC types have been refactored to achieve complete independence from the service layer. All input and output types are now derived exclusively from RPC layer code.

## Changes Made

### 1. Route Layer (packages/hono-rpc/src/routes/invites.ts)

#### Added RPC-Specific Schemas

Instead of importing schemas from `@hominem/lists-services`, we now define schemas directly in the route file:

```typescript
// Old approach (removed)
import { sendListInviteSchema, deleteListInviteSchema } from '@hominem/lists-services';

// New approach (added)
const invitesCreateSchema = z.object({
  listId: z.uuid(),
  invitedUserEmail: z.email(),
});

const invitesDeleteSchema = z.object({
  listId: z.uuid(),
  invitedUserEmail: z.email(),
});
```

#### Updated Route Validators

```typescript
// Before
.post('/create', authMiddleware, zValidator('json', sendListInviteSchema), async (c) => {

// After
.post('/create', authMiddleware, zValidator('json', invitesCreateSchema), async (c) => {
```

#### Schema Exports

All schemas are now exported for type derivation:

```typescript
export {
  invitesGetReceivedSchema,
  invitesGetByListSchema,
  invitesCreateSchema,
  invitesAcceptSchema,
  invitesDeclineSchema,
  invitesDeleteSchema,
};
```

### 2. Type Layer (packages/hono-rpc/src/types/invites.types.ts)

#### Removed Service Imports

```typescript
// Removed these imports
import { sendListInviteSchema, deleteListInviteSchema } from '@hominem/lists-services';
```

#### Added RPC Schema Imports

```typescript
import {
  invitesGetReceivedSchema,
  invitesGetByListSchema,
  invitesCreateSchema,
  invitesAcceptSchema,
  invitesDeclineSchema,
  invitesDeleteSchema,
} from '../routes/invites';
```

#### Updated Input Type Derivation

```typescript
// Before (derived from service schema)
export type InvitesCreateInput = z.infer<typeof sendListInviteSchema>;
export type InvitesDeleteInput = z.infer<typeof deleteListInviteSchema>;

// After (derived from RPC schema)
export type InvitesCreateInput = z.infer<typeof invitesCreateSchema>;
export type InvitesDeleteInput = z.infer<typeof invitesDeleteSchema>;
```

## Type Architecture

### Input Types

All input types are now derived from RPC route schemas via `z.infer`:

```
Route Handler
    ↓
Zod Schema (defined in routes/invites.ts)
    ↓
z.infer<typeof schema>
    ↓
Input Type (in types/invites.types.ts)
```

Example:

```typescript
// routes/invites.ts
const invitesCreateSchema = z.object({
  listId: z.uuid(),
  invitedUserEmail: z.email(),
});

// types/invites.types.ts
export type InvitesCreateInput = z.infer<typeof invitesCreateSchema>;
// Result: { listId: string; invitedUserEmail: string }
```

### Output Types

Output types are explicitly defined in the types file based on what handlers return:

```typescript
export interface ListInvite {
  listId: string;
  invitedUserId: string | null;
  invitedUserEmail: string;
  token: string;
  createdAt: string;
  updatedAt: string;
  accepted: boolean;
  acceptedAt: string | null;
  userId: string;
  list?: {
    id: string;
    name: string;
    userId: string;
  };
}

export type InvitesCreateOutput = ListInvite;
export type InvitesGetReceivedOutput = Array<
  ListInvite & {
    belongsToAnotherUser: boolean;
  }
>;
```

## Dependency Graph

### Before (with Service Dependencies)

```
RPC Routes
    ↓
Service Layer
    ↓
RPC Types (importing service schemas)
    ↓
Client Code
```

**Problem:** RPC types depend on service layer abstractions, creating coupling.

### After (Independent)

```
RPC Routes (with RPC schemas)
    ↓
RPC Types (derive from RPC schemas)
    ↓
Client Code
```

**Benefits:**

- RPC layer is independent
- Types document the API contract
- Service changes don't affect RPC types

## Compliance

### What Was Removed

- Import: `sendListInviteSchema` from `@hominem/lists-services`
- Import: `deleteListInviteSchema` from `@hominem/lists-services`
- Service-layer schema dependencies

### What Was Added

- `invitesCreateSchema` - RPC-specific schema for create endpoint
- `invitesDeleteSchema` - RPC-specific schema for delete endpoint
- All schemas exported for type derivation

### What Remains

- ✅ `EmptyInput` utility for no-parameter endpoints
- ✅ `ListInvite` interface (data type, not service-dependent)
- ✅ Explicit output type definitions
- ✅ All input types derived from z.infer

## Migration Path

This refactoring establishes the pattern that should be followed in other RPC type files:

1. **Define all Zod schemas in route files** - These are the source of truth
2. **Export schemas for type derivation** - Make them available to types
3. **Derive input types with z.infer** - Automatic sync with validation
4. **Define output types explicitly** - Clear, semantic definitions
5. **Never import from service layer** - Complete RPC independence

## Testing

All types compile without errors:

```bash
bun run typecheck --filter @hominem/hono-rpc
# ✅ No circular dependencies
# ✅ All types resolve correctly
# ✅ Input types match Zod schemas
# ✅ Output types properly exported
```

## Files Modified

### routes/invites.ts

- Added `invitesCreateSchema` definition
- Added `invitesDeleteSchema` definition
- Removed imports: `sendListInviteSchema`, `deleteListInviteSchema`
- Updated route validators to use RPC schemas
- Exported all schemas

### types/invites.types.ts

- Removed: `sendListInviteSchema`, `deleteListInviteSchema` imports
- Added: Imports of RPC-specific schemas from routes
- Updated input type derivations
- Updated comments to reference RPC schemas

## Example: Complete Request/Response Flow

### Create Invite

```typescript
// Client sends request
const input: InvitesCreateInput = {
  listId: 'uuid...',
  invitedUserEmail: 'user@example.com',
};
const response = await client.api.invites.create.$post(input);

// Flow:
// 1. Input validated against invitesCreateSchema (in routes)
// 2. Route handler processes request
// 3. Returns ListInvite
// 4. Client receives { success: true; data: ListInvite }

// Types:
// InvitesCreateInput = z.infer<typeof invitesCreateSchema>
// InvitesCreateOutput = ListInvite
```

### Get Received

```typescript
// Client sends request
const input: InvitesGetReceivedInput = {
  token: 'optional-token',
};
const response = await client.api.invites.received.$post(input);

// Types:
// InvitesGetReceivedInput = z.infer<typeof invitesGetReceivedSchema>
// InvitesGetReceivedOutput = Array<ListInvite & { belongsToAnotherUser: boolean }>
```

## Next Steps

Other RPC type files should follow this same pattern:

1. **Finance** - Most complex, has multiple service type imports
2. **Lists** - Imports `List` from `@hominem/lists-services`
3. **Others** - Audit for any remaining service dependencies

See `RPC_TYPE_INDEPENDENCE.md` for the full migration strategy.

## Key Principles

1. **Single Source of Truth** - Route files define validation schemas
2. **No Service Coupling** - RPC types don't depend on service abstractions
3. **Type Derivation** - Inputs auto-derived, outputs explicitly defined
4. **Clear Contracts** - Types document what the API returns
5. **Independent Evolution** - RPC and services can change independently

## References

- `RPC_TYPE_INDEPENDENCE.md` - Overall strategy for type independence
- `RPC_TYPES_FINAL_APPROACH.md` - RPC type architecture overview
- `packages/hono-rpc/src/routes/invites.ts` - Implementation
- `packages/hono-rpc/src/types/invites.types.ts` - Type definitions
