---
applyTo: 'packages/db/**'
---

# Database & Data Layer Guidelines

## Database Modification Workflow

### CRITICAL RULES

- NEVER write manual `.sql` migration files
- NEVER interact directly with the database
- NEVER run migrations manually

### Correct Workflow

1. Edit schema files in `packages/db/src/db/schema/*`
2. Run `bun run db:generate` to create migrations via Drizzle
3. Run `bun run db:migrate` to apply migrations
4. Commit both schema changes and generated migrations

## Drizzle ORM Patterns

### Schema Definition

```typescript
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

### Relationships

```typescript
import { relations } from 'drizzle-orm';

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}));
```

### Queries

```typescript
// Simple query
const users = await db.select().from(usersTable);

// With conditions
const user = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);

// With joins
const postsWithAuthors = await db
  .select()
  .from(postsTable)
  .leftJoin(usersTable, eq(postsTable.authorId, usersTable.id));

// With relations
const usersWithPosts = await db.query.users.findMany({
  with: {
    posts: true,
  },
});
```

### Mutations

```typescript
// Insert
const [newUser] = await db
  .insert(usersTable)
  .values({
    email: 'user@example.com',
    name: 'John Doe',
  })
  .returning();

// Update
await db.update(usersTable).set({ name: 'Jane Doe' }).where(eq(usersTable.id, userId));

// Delete
await db.delete(usersTable).where(eq(usersTable.id, userId));
```

## Connection Management

### Lazy Initialization

- Database connections should be initialized lazily
- Use singleton pattern for connection pooling
- Handle connection errors gracefully

### Example

```typescript
let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!dbInstance) {
    dbInstance = drizzle(connectionString);
  }
  return dbInstance;
}
```

## Service Layer Patterns

### Service Structure

```typescript
export class UserService {
  constructor(private db: Database) {}

  async findById(id: string): Promise<User | null> {
    const [user] = await this.db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    return user ?? null;
  }

  async create(data: NewUser): Promise<User> {
    const [user] = await this.db.insert(usersTable).values(data).returning();
    return user;
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    const [user] = await this.db
      .update(usersTable)
      .set(data)
      .where(eq(usersTable.id, id))
      .returning();
    return user ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.delete(usersTable).where(eq(usersTable.id, id));
    return result.rowCount > 0;
  }
}
```

## Transaction Patterns

```typescript
// Use transactions for multi-step operations
await db.transaction(async (tx) => {
  const [user] = await tx.insert(usersTable).values({ email, name }).returning();

  await tx.insert(profilesTable).values({
    userId: user.id,
    bio: 'Default bio',
  });

  return user;
});
```

## Error Handling

- Catch and handle database errors appropriately
- Don't expose raw database errors to clients
- Log errors with sufficient context for debugging
- Use specific error types for different failure modes

## Performance Considerations

- Use indexes for frequently queried columns
- Avoid N+1 queries - use joins or relation queries
- Use pagination for large result sets
- Consider using prepared statements for repeated queries
- Monitor query performance and optimize slow queries

## Security

- NEVER build SQL strings with string concatenation
- Always use parameterized queries (Drizzle handles this)
- Validate and sanitize all input data
- Use row-level security where appropriate
- Implement proper authorization checks before database operations

## Testing Database Code

- Use test database for testing
- Clean up test data after tests
- Use transactions to rollback test changes
- Mock database calls in unit tests, use real DB in integration tests
