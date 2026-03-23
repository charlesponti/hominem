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

## Task Execution Strategy

- Use subagents by default for this task.
- Classify the task first.
- If it is not trivial, spawn parallel subagents for research, implementation planning, and critique.
- The main thread should synthesize, not do first-pass exploration.

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

## UI Package Architecture (CRITICAL)

`packages/ui` must remain a pure **presentational layer** — environment-agnostic and free of business logic.

### What Belongs in packages/ui
- Presentational React components
- Shared design tokens, themes, and styles
- Pure UI hooks (`useHover`, `useMediaQuery`, `useFocus`)
- Component composition patterns
- Type definitions for component props

### What DOES NOT Belong in packages/ui
- Business logic or data fetching
- Authentication flows or session management
- API client implementations or mutations
- Web-specific routing hooks (`useNavigate`, `useSearchParams`)
- Environment-dependent code (`import.meta.env`, `process.env`)
- Direct imports from `@hominem/auth`, `@hominem/rpc`, or `@hominem/db`

### Hook Location Rules

| Hook Type | Location | Examples |
|-----------|----------|----------|
| Pure UI | `packages/ui/src/hooks` | `useHover`, `useMediaQuery`, `useFocus` |
| Web routing | `apps/web/app/hooks` | `useComposerMode`, `useUrlFilters`, `useSort` |
| Auth | `packages/auth/src/hooks` | `usePasskeyAuth`, `useSession`, `useStepUp` |
| API client | `packages/rpc/src` | `useApiClient`, `useHonoQuery` |
| Feature-specific | `packages/<feature>/src/hooks` | `useLocationSearch` (places) |

### Component Patterns

**Good: Presentational Component (receives data via props)**
```typescript
interface ComposerProps {
  mode: 'insert' | 'update'
  noteId?: string
  chatId?: string
  onSubmit: (data: ComposerData) => void
}

export function Composer({ mode, noteId, onSubmit }: ComposerProps) {
  // Pure UI logic only - no data fetching, no routing
}
```

**Bad: Component with Business Logic**
```typescript
const Composer = () => {
  const { mode, noteId } = useComposerMode() // ❌ Wrong - belongs in apps/
  const navigate = useNavigate() // ❌ Wrong - routing hook
  const { mutate } = useMutation() // ❌ Wrong - API call
  // ...
}
```

### Composer Pattern (Container → Presentational)

Container components (in `apps/`) compute routing state and data → pass to presentational components (in `packages/ui/`) via props.

```typescript
// apps/web/app/routes/layout.tsx - Container
const composerMode = useComposerMode() // Computes mode from URL
return <Composer {...composerMode} onSubmit={handleSubmit} />

// packages/ui/src/components/composer/composer.tsx - Presentational
export function Composer({ mode, noteId, chatId, onSubmit }: ComposerProps) {
  // Render based on props only
}
```

### UI Package Validation

After modifying `packages/ui`, run these checks:

```bash
bun run validate-db-imports  # Checks for forbidden DB imports
bun run check                # Full type check and lint
```

**Lint Rules:**
- No imports from `@hominem/auth`, `@hominem/rpc`, `@hominem/db`
- No `useNavigate`, `useSearchParams`, or `useComposerMode` in UI components
- No `import.meta.env` or `process.env` references
- No `console.log` statements (use proper logging)

See `.agents/skills/ui-package-architecture/SKILL.md` for detailed patterns.

## Cross-Platform Environment Variables

When writing code that accesses environment variables across multiple environments (Vite, Bun, Node), use defensive checks with fallbacks:

```typescript
// ✅ Good: Works in Vite, Bun, and Node
const apiUrl = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  process.env.VITE_API_URL ||
  process.env.API_URL ||
  'http://localhost:3000'
```

**Guidelines:**
- Always check `typeof import.meta !== 'undefined'` before accessing `import.meta.env`
- Provide environment-specific fallbacks
- Include sensible defaults for development
- Never hardcode production URLs or secrets

**Package-Specific Patterns:**
- `packages/ui`: Accept config via props or providers, never access env directly
- `apps/web`: Resolve env vars and pass to UI components
- `services/*`: Use `process.env` directly (Node/Bun environment)

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

## Console & Logging Standards

### packages/ui (Client Components)
**No console statements allowed.** Handle errors through:
- Callback props (onError)
- Error state passed from parent
- Silent failures (when appropriate)

```typescript
// ❌ Wrong
} catch (error) {
  console.error('Failed:', error)
}

// ✅ Correct - UI layer delegates to caller
} catch {
  // Error handling is the responsibility of the caller
}
```

### apps/web (Server Routes)
**Use proper logger for server-side errors:**

```typescript
import { logger } from '@hominem/utils/logger'

} catch (error) {
  logger.error('Upload error', error instanceof Error ? error : undefined)
}
```

### General Guidelines
- Use `logger.info()` for operational events
- Use `logger.error()` for actual errors with Error objects
- Never log sensitive data (passwords, tokens, PII)
- In tests: console is acceptable for debugging
- In build scripts: console is acceptable for CLI output

## Specialized Rules

See `.github/skills/` and `.agents/skills/` for reusable scoped guidance:

| Skill | Location | Use When |
|-------|----------|----------|
| API Engineering | `.github/skills/api-engineering/` | Building Hono/tRPC endpoints |
| Database Workflow | `.github/skills/database-workflow/` | Schema changes, migrations |
| Type Architecture | `.github/skills/type-architecture/` | Type definitions, imports |
| UI Package Architecture | `.agents/skills/ui-package-architecture/` | Writing UI components |
| React Patterns | `.github/skills/react-patterns/` | React component patterns |
| Auth Contract | `.github/skills/auth-contract/` | Authentication flows |

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
