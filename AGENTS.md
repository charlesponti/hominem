# AGENTS.md - Coding Guidelines for Hominem

Hominem is a **monorepo** full-stack application using Bun, TypeScript, React, Hono, Drizzle ORM, and PostgreSQL.

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
| **Safety Check** | `bun run check` (Lint + Typecheck + Test) |
| **Type Audit** | `bun run type-perf:audit` |
| **Type Dashboard** | `bun run type-perf:dashboard -- --audit-first --open` |
| **Type Diagnosis** | `bun run type-perf:diagnose -- --package <pkg>` |

## Project Structure

- `apps/` - Applications (e.g., `rocco`, `notes`, `finance`)
- `packages/` - Shared libraries (`@hominem/*`)
  - `db/` - Drizzle ORM schemas & database services
  - `auth/` - Supabase authentication helpers
  - `ui/` - Shadcn UI components
  - `utils/` - Shared utility functions
  - `hono-rpc/` - Hono + tRPC server definitions
  - `hono-client/` - Frontend client for API
- `services/` - Standalone services (e.g., `api`)

## Universal Coding Principles

### Code Style & Formatting

- **Indentation:** 2 spaces.
- **Semicolons:** None (unless syntactically required).
- **Quotes:** Single quotes `'` for code, double quotes `"` for JSX attributes.
- **Naming:**
  - `camelCase` for variables, functions, and methods.
  - `PascalCase` for components and classes.
  - `UPPER_CASE` for constants.
  - `is/has/can` prefixes for booleans (e.g., `isLoading`, `hasError`, `canEdit`).
- **Syntax:**
  - Use `===` for strict equality.
  - Use template literals `` `Hello ${name}` `` over string concatenation.
  - Use `for (const x of arr)` over `.forEach()`.
  - Use `Number.parseInt()`/`Number.parseFloat()` over global versions.
  - Place `else` on the same line: `} else {`.
  - Always use braces for multi-line `if` blocks.

### TypeScript Standards

- **No `any` or `unknown`**: Use specific types.
- **Type Imports**: Use `import type { ... }` separately from logic imports.
- **Definitions**: Use `interface` for object shapes, `type` for unions/primitives/intersections.
- **Utility Types**: Leverage `Pick<T, K>`, `Omit<T, K>`, `Partial<T>`, and `Record<K, V>`.
- Use `type-audit` tool for performance checks:
  - `bun run type-perf:audit -- --graph` - Full audit with dependency analysis
  - `bun run type-perf:diagnose -- --package <pkg>` - Detailed package analysis
  - `bun run type-perf:dashboard -- --audit-first --open` - Interactive HTML dashboard
  - `bun run type-perf:tsserver -- --logfile <path>` - IDE performance analysis

### Error Handling

- **Guard Clauses**: Handle errors early; keep the "happy path" at the end.
- **No `else`**: Avoid `else` blocks after an early `return`.
- **Async**: Always handle promises with `try/catch` or `.catch()`.
- **User-Facing**: Provide clear, actionable messages; never leak internal server details.

### Input Validation & Security

- **Zod**: Validate all external inputs, API payloads, and configuration objects.
- **Sanitization**: Clean user-generated content (especially HTML).
- **SQL**: Use parameterized queries (default in Drizzle ORM).
- **Auth**: Always verify authentication tokens and authorization before sensitive operations.

## Technology Guidelines

### React Components

- **Server First**: Default to Server Components; use `'use client'` only for state or events.
- **State Management**:
  - **Global/UI**: Zustand.
  - **Server/Local-First**: React Query + IndexedDB.
  - **Forms**: React Hook Form + Zod.
- **Styling**: Tailwind CSS (utilities only; no `@apply`). Use CSS Modules for complex logic.
- **Performance**: Avoid inline functions in JSX; use `React.memo` only when profiled.
- **A11y**: Use semantic HTML (`<main>`, `<nav>`, etc.). Support keyboard navigation and ARIA roles.

### API Development (Hono + tRPC)

- **Procedures**: Use `hono.procedure.input(...)` for strictly typed inputs.
- **Error Propagation**: Throw `TRPCError` with specific codes (e.g., `NOT_FOUND`, `UNAUTHORIZED`).
- **Client**: Use `useHonoQuery` or `useHonoMutation` from `@hominem/hono-client/react`.

### Database (Drizzle ORM)

- **Schema Location**: `packages/db/src/schema/*.ts`.
- **Migration Workflow**:
  1. **Modify Schema**: Edit TypeScript files in `packages/db/src/schema/`.
  2. **Generate**: Run `bun run db:generate` to create a new SQL file in `packages/db/src/migrations/`.
  3. **Review**: Inspect the generated SQL file to ensure accuracy.
  4. **Apply**: Run `bun run db:migrate` to update the database.
  5. **No Manual Edits**: Never manually edit SQL migration files. If a migration is wrong, fix the schema and regenerate.
- **Patterns**: Use lazy-initialized database connections and prefer direct service calls in loaders.

### Testing (Vitest)

- **Focus**: Critical business logic, security boundaries, and API contracts.
- **React Testing**: Use React Testing Library. Query by role (`screen.getByRole('button')`) and test interactions, not implementation details.
- **Mocks**: Mock external dependencies (API, DB) in unit tests; use real DB in integration tests.

## Imports & Dependencies

### Package Imports

Always use path aliases from the root `tsconfig.base.json`:

```typescript
import { user } from '@hominem/db/schema/users'; // Database table
import { Button } from '@hominem/ui'; // UI components
import { useAuth } from '@hominem/auth'; // Auth utilities
import { clsx } from '@hominem/utils'; // Shared utilities
import { api } from '@hominem/hono-client/react'; // API client
```

### Key Dependencies

- **Runtime**: Bun (>=1.1.0), Node.js (>=20)
- **Web**: React 19, React Router 7, Tailwind CSS
- **Server**: Hono, tRPC, Supabase Auth
- **Validation**: Zod
- **Database**: Drizzle ORM, PostgreSQL
- **Tools**: oxlint, oxfmt (Rust-based linting/formatting)

## See Also

For specialized guidelines, refer to:

- `.github/instructions/react.instructions.md` - React-specific patterns.
- `.github/instructions/api.instructions.md` - Hono & tRPC development.
- `.github/instructions/database.instructions.md` - Drizzle best practices.
- `.github/skills/ready-for-prod/SKILL.md` - Final production checklist.
- `.github/skills/type-audit/SKILL.md` - Diagnosing TypeScript performance issues.
