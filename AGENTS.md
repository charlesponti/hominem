# AGENTS.md - Coding Guidelines for Hominem

## Core Workflow Commands

Always run commands from the monorepo root. Do NOT `cd` into packages.

| Task | Command |
| :--------------- | :------------------------------------------- |
| **Install** | `bun install` |
| **Dev** | `bun run dev` (or `--filter <package>`) |
| **Build** | `bun run build` |
| **Test** | `bun run test` (or `--filter <package>`) |
| **Typecheck** | `bun run typecheck` |
| **Lint/Format** | `bun run lint --parallel` / `bun run format` |
| **Safety Check** | `bun run check` |

## Project Structure

- `apps/` - Applications
- `packages/` - Shared libraries
- `services/` - Standalone services

## Universal Coding Rules

### Code Style

- 2 spaces, no semicolons.
- Single quotes for code, double quotes for JSX attributes.
- `camelCase` variables/functions, `PascalCase` components/classes, `UPPER_CASE` constants.
- Boolean names use `is/has/can` prefixes.
- Use `===`, template literals, and `for...of` loops.
- Use `Number.parseInt()`/`Number.parseFloat()`.
- `} else {` on the same line.
- Use braces for multi-line `if` blocks.

### TypeScript

- No `any` or `unknown`.
- Use `import type { ... }` for type-only imports.
- Use `interface` for object shapes, `type` for unions/primitives/intersections.

### Error Handling

- Use guard clauses and early returns.
- Always handle promises with `try/catch` or `.catch()`.
- Do not leak internal errors to users.

### Security

- Validate external inputs with Zod.
- Sanitize user-generated content.
- Use parameterized DB queries.
- Verify auth and authorization for sensitive operations.

## Database Access Rules (CRITICAL)

- Only the RPC server can access the database (`@hominem/db`)
- Apps must use the RPC client (`@hominem/hono-client`) for data access.

### For Applications (apps/*)

**ALLOWED:**
- `@hominem/hono-client` - For RPC queries/mutations
- `@hominem/hono-rpc` - For types and client configuration
- `@hominem/hono-rpc/types` - For API input/output types only (never DB structure)

**FORBIDDEN:**
- `import { db } from '@hominem/db'` - Direct DB access
- `import * from '@hominem/db/schema/*'` - Database schema types
- `import * from '@hominem/db/types/*'` - Database structure types
- Any import of database-internal types or structure

**Example - Correct Pattern:**
```typescript
// ✅ Good - Using RPC client for data access
import { useHonoQuery } from '@hominem/hono-client/react';
import type { TaskStatus } from '@hominem/hono-rpc/types';

export function useTasks() {
  return useHonoQuery(['tasks'], async (client) => {
    const res = await client.api.tasks.$get();
    return res.json();
  });
}
```

**Example - Incorrect Pattern:**
```typescript
// ❌ Bad - Direct DB access in apps
import { db } from '@hominem/db';
import type { TaskStatus } from '@hominem/db/schema/tasks';

export async function getTasks() {
  return db.query.tasks.findMany(); // NEVER do this in apps
}
```

### For API Layer (services/api, packages/hono-rpc)

Direct DB access is permitted and expected. Services should:
1. Import `db` from `@hominem/db`
2. Throw typed errors (NotFoundError, etc.)
3. Let error middleware handle HTTP responses

### Validation

Run `bun run validate-db-imports` to check for violations.
This runs automatically during `bun run check`.

## Tech Stack

- Runtime: Bun (>=1.1.0), Node.js (>=20)
- Web: React 19, React Router 7, Tailwind CSS
- Server: Hono, tRPC, Supabase Auth
- Database: Drizzle ORM, PostgreSQL
- Validation: Zod
- Tools: oxlint, oxfmt

## API Preferences

- Use Hono + tRPC patterns defined in [.github/instructions/api.instructions.md](.github/instructions/api.instructions.md).
- Use `useHonoQuery` / `useHonoMutation` in client code.

## Type Performance Tools

- `npx @hackefeller/type-audit --project . --threshold 1.0`

## Imports

- Use path aliases defined in each package/app `tsconfig.json` for internal packages.
- Prefer direct schema/type imports per [.github/instructions/type-architecture.instructions.md](.github/instructions/type-architecture.instructions.md).

## Specialized Rules

See `.github/instructions/` for scoped guidance.
