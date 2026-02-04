# Hominem Database Schema Standards

**Version**: 1.0  
**Effective Date**: 2026-02-03  
**Scope**: All schema definitions in `packages/db/src/schema/`

---

## 1. File Organization

### 1.1 Directory Structure
All schema files must reside in `packages/db/src/schema/`.

- `{domain}.schema.ts`: Drizzle table definitions, relations, and enums.
- `{domain}.types.ts`: TypeScript type exports (inferred from schema).
- `{domain}.validation.ts`: **DEPRECATED**. Move Zod schemas to `{domain}.schema.ts`.

### 1.2 Import Conventions
- **DO NOT** import from `.types.ts` inside `.schema.ts` (circular dependency).
- **DO** import shared helpers from `./shared.schema`.

---

## 2. Table Definitions

### 2.1 ID Generation
All tables must use UUIDs as primary keys with default random generation.

**✅ Correct:**
```typescript
import { uuid } from 'drizzle-orm/pg-core';

id: uuid('id').primaryKey().defaultRandom(),
```

**❌ Incorrect:**
```typescript
id: serial('id').primaryKey(), // Don't use serial
id: uuid('id').primaryKey(),   // Missing defaultRandom()
```

### 2.2 Naming Conventions
- **Database Columns**: `snake_case`
- **TypeScript Properties**: `camelCase`

**✅ Correct:**
```typescript
isAdmin: boolean('is_admin').default(false),
createdAt: timestamp('created_at', ...),
```

**❌ Incorrect:**
```typescript
isAdmin: boolean('isAdmin'), // DB column is camelCase
created_at: timestamp('created_at'), // TS property is snake_case
```

### 2.3 Timestamps
All tables must have `createdAt` and `updatedAt` with millisecond precision.

**✅ Correct:**
```typescript
import { createdAtColumn, updatedAtColumn } from './shared.schema';

createdAt: createdAtColumn(),
updatedAt: updatedAtColumn(),
```
*Or manual definition:*
```typescript
createdAt: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
updatedAt: timestamp('updated_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
```

**❌ Incorrect:**
```typescript
createdAt: timestamp('created_at').defaultNow(), // Missing precision/mode
```

---

## 3. Foreign Keys & Relations

### 3.1 Declaration Style
- **Simple FKs**: Use inline `.references()`
- **Cascading FKs**: Use explicit `foreignKey()` in the extra config block

**✅ Correct (Simple):**
```typescript
userId: uuid('user_id').references(() => users.id),
```

**✅ Correct (Cascade):**
```typescript
// In table definition
userId: uuid('user_id').notNull(),
},
(table) => ({
  fk: foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id]
  }).onDelete('cascade')
})
```

### 3.2 Indexing Foreign Keys
**ALL** foreign key columns must be indexed.

**✅ Correct:**
```typescript
(table) => [
  index('table_user_id_idx').on(table.userId),
]
```

---

## 4. Shared Helpers
Use `shared.schema.ts` helpers whenever possible to enforce consistency.

| Helper | Usage |
|--------|-------|
| `requiredUuidColumn('name')` | `uuid('name').notNull()` |
| `optionalUuidColumn('name')` | `uuid('name')` |
| `requiredTextColumn('name')` | `text('name').notNull()` |
| `createdAtColumn()` | Standard created_at definition |
| `updatedAtColumn()` | Standard updated_at definition |

---

## 5. Zod Schemas
Define Zod schemas in the same file as the table definition (`.schema.ts`).

**✅ Correct:**
```typescript
// users.schema.ts
export const UserRoleSchema = z.enum(['admin', 'user']);
export const users = pgTable(...)
```

---

## 6. Migration Best Practices
- **Never rename columns** without a 2-step migration plan (Add new -> Copy -> Drop old).
- **Index creation** on large tables must use `CREATE INDEX CONCURRENTLY`.
- **Foreign Key constraints** must be validated against existing data before adding.

---

## 7. Review Checklist
Before submitting a schema PR:
- [ ] ID is `uuid` with `defaultRandom()`
- [ ] Columns are `snake_case` in DB, `camelCase` in TS
- [ ] Timestamps use precision 3 and string mode
- [ ] All FKs have corresponding indexes
- [ ] Zod schemas are colocated
- [ ] Shared helpers used where applicable
