# @hominem/data

Database schemas and utilities for the Hominem monorepo.

## Features

- Database connection and utilities
- Drizzle ORM schemas for all domains
- Type-safe database operations
- Migration management
- **Lazy database initialization** - the database connection is only created when used

## Usage

```typescript
// Import database connection
import { db } from '@hominem/data/db'

// Import schemas
import { users, transactions, notes } from '@hominem/data/schema'

// Use in your application
// Database connection is automatically created on first use
const allUsers = await db.select().from(users)
```

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string (required when using the database)
- `NODE_ENV=test` - Automatically uses test database connection

**Note:** The package can be imported without `DATABASE_URL` set. The database connection is only created when you actually query the database. This allows applications that don't use the database to import shared utilities without requiring database configuration.

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
