# @hominem/db

Database schema and migrations for Hominem applications.

## Installation

```bash
bun add @hominem/db
```

## Usage

```typescript
import { getDb } from '@hominem/db'
import * as schema from '@hominem/db/schema'
```

## Database Commands

```bash
# Generate migrations
bun run db:generate

# Apply migrations
bun run db:migrate

# Open Drizzle Studio
bun run db:studio
```
