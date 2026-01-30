# AGENTS.md - Coding Guidelines for Hominem

Hominem is a **monorepo** full-stack application using Bun, TypeScript, React, Hono, Drizzle ORM, and PostgreSQL.

## Build, Lint & Test Commands

**Install dependencies:**

```bash
bun install
```

**Development:**

```bash
bun run dev              # Start all dev servers
bun run dev --filter @hominem/db  # Dev for specific package
```

**Build:**

```bash
bun run build            # Build all packages
bun run build --force    # Force rebuild
```

**Testing:**

```bash
bun run test             # Run all tests
bun run test --force     # Force rerun
bun run test --filter @hominem/db  # Test specific package
bun run test path/to/file.test.ts  # Run single test file
```

**Linting & Formatting:**

```bash
bun run lint --parallel  # Run oxlint across all packages
bun run format           # Format with oxfmt
bun run check            # Lint + typecheck + test
```

**Typecheck:**

```bash
bun run typecheck        # TypeScript type checking
```

## Project Structure

- `apps/` - Applications (rocco, notes, finance)
- `packages/` - Shared libraries (@hominem/\*)
  - `db/` - Drizzle ORM schemas & database
  - `auth/` - Supabase authentication
  - `ui/` - Shadcn UI components
  - `utils/` - Utility functions
  - `hono-rpc/` - Hono + tRPC server
  - `hono-client/` - tRPC client for React
- `services/` - Standalone services (e.g., api)

## Code Style & Formatting

**Indentation & Quotes:**

- 2 spaces for indentation
- No semicolons (except where required by syntax)
- Single quotes for code: `'hello'`
- Double quotes for JSX attributes: `<Component title="Text" />`

**Naming Conventions:**

- `camelCase` for variables, functions, methods
- `PascalCase` for components, classes
- `UPPER_CASE` for constants
- `isLoading`, `hasError`, `canEdit` for booleans (use `is`, `has`, `can`)

**Syntax Preferences:**

- Use `===` for strict equality, avoid `==`
- Use template literals: `` `Hello ${name}` `` not string concat
- Use `for (const x of arr)` instead of `.forEach()`
- Use `Number.parseFloat()`, `Number.parseInt()` over `parseFloat()`, `parseInt()`
- Place `else` on same line: `} else {`
- Always use braces for multi-line `if` blocks

## TypeScript Standards

**No `any` Type:**

- Never use `any`.
- Never use `unknown`. Use specific types whenever possible.

**Type Imports:**

```typescript
import type { User, Config } from './types';
import { getUserById, defaultConfig } from './utils';
```

**Type Definitions:**

- Use interfaces for object shapes
- Use type aliases for unions, intersections, primitives
- Use `const` assertions for literal types: `const status = 'active' as const`
- Use discriminated unions for complex state

**Utility Types:**

- Prefer `Pick<T, K>`, `Omit<T, K>`, `Partial<T>` to reduce code
- Use `Record<K, V>` for key-value maps

## Error Handling

**Pattern:**

- Handle errors early with guard clauses
- Put the "happy path" last
- Avoid `else` blocks where early return works
- Always handle async errors with try/catch or `.catch()`

**Example:**

```typescript
if (!user) {
  return { error: 'User not found' };
}
if (!user.canEdit) {
  return { error: 'Permission denied' };
}
// Happy path here
return { success: true, data: user };
```

**User-Facing Errors:**

- Provide clear, actionable messages
- Never expose internal/server errors to users
- Log errors with sufficient context for debugging

## Testing with Vitest

**Run Tests:**

```bash
bun run test                              # All tests
bun run test path/to/file.test.ts         # Single file
bun run test --reporter=verbose           # Verbose output
bun run test --coverage                   # Coverage report
```

**Focus Areas:**

- Critical business logic paths
- Security boundaries (input validation, sanitization)
- API contracts and database operations
- React component interactions (not implementation details)

**React Testing:**

- Use React Testing Library for component tests
- Query by role: `screen.getByRole('button')`
- Test user interactions, not internals
- Mock external dependencies (API, database)

## Validation & Security

**Input Validation:**

```typescript
import { z } from 'zod';

const userSchema = z.object({
  email: z.string().email(),
  age: z.number().int().positive(),
});

const result = userSchema.safeParse(input);
```

**Always:**

- Validate all external inputs with Zod
- Sanitize user-generated content (especially HTML)
- Use parameterized queries only (Drizzle does this)
- Verify authentication tokens before sensitive ops
- Validate file uploads (type, size, content)

## React Component Guidelines

**Server vs Client:**

- Default to Server Components (no `'use client'`)
- Use Client Components only when needed: state, events, hooks

**State Management:**

- **Global State:** Zustand for UI state
- **Server Data:** React Query + IndexedDB
- **Forms:** React Hook Form + Zod

**Performance:**

- Avoid inline function definitions in JSX
- Use `React.memo` only when profiling shows benefit
- Leverage Server Components for better performance
- Use Suspense for code splitting

**Styling:**

- Use Tailwind CSS for utilities
- Use CSS Modules for complex styles
- Never use `@apply` directive
- Mobile-first: design for small screens first

**Accessibility:**

- Use semantic HTML: `<button>`, `<a>`, `<nav>`, `<main>`
- Include ARIA attributes where needed
- Support keyboard navigation (Tab, Enter, Escape)
- Alt text for images
- WCAG color contrast standards

## API Development (Hono + tRPC)

**Pattern:**

```typescript
import { hono } from '@hominem/hono-rpc';

export const userRouter = hono.router({
  getById: hono.procedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const user = await getUser(input.id);
    if (!user) throw new TRPCError({ code: 'NOT_FOUND' });
    return user;
  }),
});
```

**Error Handling:**

- Throw `TRPCError` with specific codes (NOT_FOUND, UNAUTHORIZED, BAD_REQUEST, etc.)
- Never leak internal errors to client
- Return errors as proper HTTP status codes

## Database (Drizzle ORM)

**Schema Location:** `packages/db/src/schema/*.ts`

**Commands:**

```bash
bun run db:generate   # Generate migrations from schema
bun run db:migrate    # Apply migrations
bun run db:push       # Push schema to database
bun run db:studio     # Open Drizzle Studio UI
```

**Patterns:**

- Define schemas in `schema/` directory
- Use parameterized queries (Drizzle does this automatically)
- Lazy-initialize database connections
- Import from `@hominem/db` and `@hominem/db/schema`

## Package Imports

Always use path aliases from root `tsconfig.base.json`:

```typescript
import { User } from '@hominem/db/schema'; // Database types
import { useAuth } from '@hominem/auth'; // Auth utilities
import { Button } from '@hominem/ui'; // UI components
import { clsx } from '@hominem/utils'; // Utilities
import { api } from '@hominem/hono-client/react'; // API client
```

Do NOT `cd` into packages; use Turbo commands from monorepo root.

## Pre-Commit & CI Checks

Husky hooks run on commit. Ensure:

- Linting passes: `bun run lint --parallel`
- Code is formatted: `bun run format`
- Types are valid: `bun run typecheck`
- Critical tests pass: `bun run test --filter <package>`

## Key Dependencies

- **Runtime:** Bun, Node.js ≥20
- **Language:** TypeScript 5.9.3
- **Web:** React 19, React Router 7
- **Server:** Hono, tRPC
- **Database:** Drizzle ORM, PostgreSQL
- **Auth:** Supabase Auth
- **Validation:** Zod
- **State:** Zustand, React Query
- **UI:** Tailwind CSS, Shadcn UI, Radix UI
- **Testing:** Vitest 4.0.16, React Testing Library
- **Linting:** oxlint, oxfmt (Rust-based, very fast)

## See Also

For specialized guidelines, refer to:

- `.github/skills/type-audit/SKILL.md` - Use `/type-audit` to diagnose TypeScript performance issues.
- `.github/skills/ready-for-prod/SKILL.md` - Use `/ready-for-prod` for a final security, performance, and simplicity check.
- `.github/instructions/principles.instructions.md` - Universal coding principles
 - `.github/instructions/principles.instructions.md` - Deprecated pointer to `AGENTS.md` (do not edit; update AGENTS.md instead)
- `.github/instructions/react.instructions.md` - React component guidelines
- `.github/instructions/api.instructions.md` - API development patterns
- `.github/instructions/database.instructions.md` - Database best practices
- `.github/copilot-instructions.md` - Full Copilot guidelines

## Universal Coding Principles


Package References

- Authentication: `@hominem/auth`
- Data models and services: `@hominem/db`
- Utility functions: `@hominem/utils`
- UI components: `@hominem/ui`

Code Style & Formatting (Biome)

- Indentation: 2 spaces
- Semicolons: None (except where required by syntax)
- Quotes: Single quotes for code, double quotes for JSX
- Naming:
  - Variables/Functions: `camelCase`
  - Components: `PascalCase`
  - Booleans: Auxiliary verbs (e.g., `isLoading`, `hasError`)
- Syntax Preferences:
  - Use `===` for strict equality
  - Use template literals over string concatenation
  - Use `for (const x of arr)` instead of `.forEach()`
  - Use `Number.parseFloat()`/`Number.parseInt()` over global functions
  - Place `else` on same line: `} else {`
  - Always use braces for multi-line `if` blocks

TypeScript Standards

- No `any` Type: Never use `any`. Prefer specific types.
- Type Imports: import types separately using `import type { ... }`
- Type Definitions: prefer interfaces for object shapes and type aliases for unions/primitives
- Utility Types: prefer `Pick`, `Omit`, `Partial` and `Record` where appropriate

Error Handling

- Handle errors early with guard clauses; put the happy path last
- Avoid else blocks when early returns suffice
- Always handle async errors with try/catch or `.catch()`
- User-facing errors: provide clear messages, never leak internal errors, log with context

Testing (Vitest)

- Run tests with `bun run test` (or turbo-driven scripts in monorepo)
- Focus tests on critical business logic, security boundaries, and API contracts
- Use React Testing Library for UI tests and query by role when possible
- Mock external dependencies in unit tests; use real DB in integration tests

Input Validation & Security

- Validate all external inputs with Zod
- Sanitize user-generated content, especially HTML
- Use parameterized queries (Drizzle handles this)
- Verify authentication/authorization before sensitive operations
- Validate file uploads (type, size, content)

Developer Workflow Notes

- Use Turbo from the monorepo root; do not `cd` into packages for script runs
- Husky pre-commit hooks run lint/typecheck; ensure lint + typecheck pass locally
- Prefer `bun --typecheck` for fast local type feedback

If you previously referenced `.github/instructions/principles.instructions.md` or `.github/copilot-instructions.md`, treat this file as the single source of truth for engineering principles going forward.
