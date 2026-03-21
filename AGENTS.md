# AGENTS.md - Coding Guidelines for Hominem

## Core Workflow Commands

Always run commands from the monorepo root. Do NOT `cd` into packages.

| Task             | Command                                      |
| :--------------- | :------------------------------------------- |
| **Install**      | `bun install`                                |
| **Dev**          | `bun run dev` (or `--filter <package>`)      |
| **Build**        | `bun run build`                              |
| **Test**         | `bun run test` (or `--filter <package>`)     |
| **Typecheck**    | `bun run typecheck`                          |
| **Lint/Format**  | `bun run lint --parallel` / `bun run format` |
| **Safety Check** | `bun run check`                              |

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

**CRITICAL: No `any` or `unknown` types ever.**

- Never use `as any`, `as unknown`, or `any` casts to escape type checking.
- If you encounter a type mismatch, fix the root cause: correct the function signature, add proper generics, or refactor the constraint.
- Do not use `any` to "make the compiler happy"—that defeats the entire purpose of TypeScript.
- Use `interface` for object shapes, `type` for unions/primitives/intersections.
- Use `import type { ... }` for type-only imports.
- Generic functions and overloads are preferred over `any` for flexible APIs.

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
- Apps must use the RPC client (`@hominem/rpc`) for data access.

### For Applications (apps/\*)

**ALLOWED:**

- `@hominem/rpc` - For RPC queries, mutations, and client configuration
- `@hominem/rpc/types/*` - For API input/output types only (never DB structure)

**FORBIDDEN:**

- `import { db } from '@hominem/db'` - Direct DB access
- `import * from '@hominem/db/schema/*'` - Database schema types
- `import * from '@hominem/db/types/*'` - Database structure types
- Any import of database-internal types or structure

**Example - Correct Pattern:**

```typescript
// ✅ Good - Using RPC client for data access
import { useHonoQuery } from '@hominem/rpc/react';
import type { TaskStatus } from '@hominem/rpc/types/tasks.types';

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

### For API Layer (services/api, packages/rpc)

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
- Server: Hono, tRPC, Better Auth
- Database: Drizzle ORM, PostgreSQL
- Validation: Zod
- Tools: oxlint, oxfmt

## API Preferences

- Use Hono + tRPC patterns defined in [.github/skills/api-engineering/SKILL.md](.github/skills/api-engineering/SKILL.md).
- Use `useHonoQuery` / `useHonoMutation` in client code.

## Imports

- Use path aliases defined in each package/app `tsconfig.json` for internal packages.
- Prefer direct schema/type imports per [.github/skills/type-architecture/SKILL.md](.github/skills/type-architecture/SKILL.md).

## Schema Changes & Type Safety

After modifying database schema (especially in `@hominem/db`), the standard commands now handle rebuilding types automatically:

### Standard workflow:

```bash
bun run check    # Rebuilds types, then runs full check suite
bun run test     # Tests with fresh builds
```

### Why this matters:

- **.d.ts files** in `build/` directories must be rebuilt for other packages to see new types
- **Stale types** can cause `Type 'X' is not assignable to type 'Y'` errors
- The `check` script now runs `build:types` first to ensure downstream packages have fresh type definitions

### If you encounter weird type errors:

```bash
# Clear turbo cache and rebuild everything
rm -rf .turbo **/.turbo && bun run check
```

## Specialized Rules

See `.github/skills/` for reusable scoped guidance.

## FORBIDDEN

_These are things you are not able to do._

- Modify database schema using `psql` or other direct calls.
- Commit code without running `bun run check` first.
- Use hardcoded credentials or secrets in code.
- Bypass authentication/authorization checks.
- Import database types in client applications.
- Use `eval()` or dynamic code execution on user input.
- Deploy without running the full test suite.
- Modify production environment variables locally.
- Create database transactions without proper error handling.
- Use string concatenation for SQL queries.
- Remove or weaken type safety with `any` types.
- Log sensitive user data or API responses.
- Deploy code that hasn't been type-checked.
- Modify shared library APIs without updating all dependents.
- Disable linting or security checks.
