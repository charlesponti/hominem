# @hominem/data

Database schemas and utilities for the Hominem monorepo.

## Features

- Database connection and utilities
- Drizzle ORM schemas for all domains
- Type-safe database operations
- Migration management

## Usage

```typescript
// Import database connection
import { db } from '@hominem/data'

// Import schemas
import { users, transactions, notes } from '@hominem/data/schema'

// Use in your application
const allUsers = await db.select().from(users)
```

## Exports

- `@hominem/data` - Main package exports
- `@hominem/data/db` - Database connection and utilities
- `@hominem/data/schema` - All database schemas

## Development

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build

# Generate database migrations
pnpm db:generate

# Run migrations
pnpm migrate
``` 
