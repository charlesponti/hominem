# Kysely-Atlas Migration Progress

## Overview

This document tracks progress on the migration from Drizzle ORM to Kysely + Atlas. The migration involves rewriting all RPC route handlers to use Kysely directly, eliminating the service layer entirely.

**Status**: ~40% complete (11 of 23 domain groups migrated)

## Completed Phases

### Phase 1: Infrastructure Setup ✅

- [x] Atlas CLI installed and configured with PostgreSQL
- [x] Atlas schema file created (`packages/db/schema.sql`)
- [x] Kysely and kysely-codegen dependencies added
- [x] Kysely instance created (`packages/db/src/db.ts`) with connection pooling
- [x] Kysely types generated (`packages/db/src/types/database.ts`)
- [x] All types exported from `@hominem/db`

### Phase 2: Base Domains ✅

All base domain routes have been fully migrated to Kysely:

- **tasks.ts**: 5 handlers (list, get, create, update, delete)
- **bookmarks.ts**: 5 handlers (list, get, create, update, delete)
- **tags.ts**: 8 handlers (list, get, create, update, delete, tag entity, untag, sync)
- **calendar.ts**: 11 handlers (list events, get, create, update, delete, attendees CRUD, Google sync)

### Phase 3: Authentication & Health Services ✅

- **@hominem/auth**: Migrated account.service.ts and user-auth.service.ts to Kysely
- **@hominem/health-services**: Migrated health.service.ts to Kysely

### Phase 4: Chat System ✅

- Created `chat` and `chat_message` tables with proper schema, foreign keys, and RLS policies
- **chats.ts**: All chat handlers rewritten with ownership verification and hydration helpers
- **messages.ts**: All message handlers rewritten with message tree support

### Phase 5: Complex Domains ✅

#### Notes Domain
- Fully migrated to Kysely with tag relationship handling
- Created helper functions:
  - `dbToNote()`: Converts database row to API type
  - `getNoteWithOwnershipCheck()`: Ownership verification with error handling
  - `hydrateNoteTags()`: Loads and hydrates note tags
  - `syncNoteTags()`: Updates note-tag relationships
- All 10 endpoints: list (filtering, sorting, pagination), get, versions, create, update, delete, publish, archive, unpublish, expand/outline/rewrite (stub)

#### Finance Accounts Domain
- Fully migrated to Kysely with proper Selectable type handling
- Created helper functions:
  - `getAccountWithOwnershipCheck()`: Account lookup with authorization
  - `getTransactionsForAccount()`: Transaction retrieval with pagination
  - `toAccountData()`: Database row to API type conversion
  - `toTransactionData()`: Transaction row conversion with amount parsing
- All 9 endpoints: list, get (with transactions), create, update, delete, with-plaid, connections, institution-accounts, all

## Key Discoveries & Patterns

### 1. Table Creation Pattern
When tables don't exist, create them directly via SQL connection, then regenerate Kysely types:
```bash
# Create table
# Then regenerate types
bun run build:types
# Or within the kysely-codegen setup
```

### 2. Kysely Type Export
Generated types export `DB` interface, but app code expects `Database`:
```typescript
export type Database = DB;
```

### 3. Database Column Naming
- Database uses snake_case (user_id, created_at, account_type)
- API types expect camelCase (userId, createdAt, accountType)
- Use conversion functions with `Selectable<>` type utility:
```typescript
function toAccountData(row: Selectable<Database['finance_accounts']>): AccountData {
  return {
    userId: row.user_id,
    createdAt: row.created_at,
    // ...
  }
}
```

### 4. Optional Return Handling
`executeTakeFirst()` returns `T | undefined`. Handle safely with:
```typescript
const account = await db.selectFrom('finance_accounts').executeTakeFirst()
// Type: Selectable<Database['finance_accounts']> | undefined
```

Use non-null assertions when preceding operations throw on missing data:
```typescript
// Safe because getAccountWithOwnershipCheck() throws if not found
const account = await getAccountWithOwnershipCheck(id, userId)
// Type: Selectable<Database['finance_accounts']> (non-null)
```

### 5. Ownership Verification Pattern
Create reusable async helper:
```typescript
async function getAccountWithOwnershipCheck(accountId: string, userId: string) {
  const account = await db
    .selectFrom('finance_accounts')
    .selectAll()
    .where((eb) => eb.and([
      eb('id', '=', accountId),
      eb('user_id', '=', userId)
    ]))
    .executeTakeFirst()
  
  if (!account) {
    throw new NotFoundError('Account not found')
  }
  return account // Type is now non-null
}
```

### 6. Relationship Handling
For many-to-many (e.g., notes ↔ tags):
- Keep separate tables: `tags`, `note_tags` (with foreign keys)
- Never store values directly in junction table
- Pattern:
  1. Upsert tag in `tags` table
  2. Link via `note_tags` table
  3. Query with joins: `selectFrom('tags').leftJoin('note_tags', ...)`

### 7. Type Safety with Selectable
Always use `Selectable<Database['table_name']>` for database row types:
```typescript
// ✅ Good - Type-safe
function convert(row: Selectable<Database['finance_accounts']>): AccountData { }

// ❌ Avoid - Loses type safety
function convert(row: any): AccountData { }
```

## Current Work

### finance.accounts.ts Status
- All 9 endpoints rewritten with Kysely
- Type issues with `executeTakeFirst()` optional returns need verification
- Ready for type checking and testing

## Pending Migrations

### High Priority (Tables exist, simpler logic)
1. **finance.transactions.ts** - Transaction CRUD operations
2. **finance.institutions.ts** - Institution management
3. **finance.tags.ts** - Finance-specific tags
4. **finance.budget.ts** - Budget management

### Medium Priority (Tables exist, moderate complexity)
1. **places.ts** - Location and visit tracking
2. **health.ts** - Health events (may need events system evaluation)
3. **lists.query.ts / lists.mutation.ts** - Lists and items
4. **items.ts** - List items
5. **invites.ts** - List share invitations

### Lower Priority (Complex systems or external APIs)
1. **goals.ts / habits.ts** - Event-based tracking (events-services dependency)
2. **finance.plaid.ts** - Plaid integration
3. **finance.export.ts / finance.analyze.ts / finance.data.ts / finance.runway.ts** - Analytics
4. **trips.ts** - Trip planning
5. **twitter.ts** - Twitter integration

## Testing Strategy

Currently, full build will fail until all routes are migrated (expected).

After each batch of migrations:
1. Run `bun run typecheck` to verify types
2. Run `bun run test` for integration tests
3. Batch commit with descriptive message

No individual commits for each route - batch 2-3 related routes per commit.

## Cleanup Phase

After all routes migrated:
1. Remove Drizzle dependencies
2. Delete schema files and migrations
3. Delete service files (now redundant)
4. Clean up db package exports
5. Final build, test, lint verification
