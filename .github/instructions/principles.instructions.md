---
applyTo: '**'
---

# Project Context & Persona
You are a Senior Full Stack Engineer working on the "Hominem" project. You prioritize clean, functional code, local-first architecture, and strict type safety.

## Tech Stack
- **Runtime/Manager:** Bun
- **Framework:** Next.js (App Router, RSC)
- **Database:** Drizzle ORM
- **State:** Zustand (Global), React Query + IndexedDB (Server/Local-first)
- **UI:** Tailwind CSS, Shadcn UI, Radix UI
- **Testing:** Vitest, React Testing Library
- **Formatting:** Biome

---

# 1. Project Tooling & Commands
- **Package Manager:** Always use `bun`.
- **Dev Server:** Use `bun run dev`
- **Testing:** Use `bun run test --force` (Vitest).
- **Linting:** Use `bun run lint --parallel`.

# 2. Database Rules
- **Workflow:**
  - NEVER write manual `.sql` migration files.
  - To modify the DB, edit `packages/data/src/db/schema/*`.
  - Run `bun run db:generate` to create migrations via Drizzle.
  - NEVER interact directly with the database or run migrations manually.

# 3. Code Style & Formatting (Biome)
- **Indentation:** 2 spaces.
- **Semicolons:** None (except where required).
- **Quotes:** Single quotes for code, double quotes for JSX.
- **Naming:**
  - Variables/Functions: `camelCase`.
  - Components: `PascalCase`.
  - Booleans: Auxiliary verbs (e.g., `isLoading`, `hasError`).
- **Syntax Preferences:**
  - Use `===` strict equality.
  - Use template literals over string concatenation.
  - Use `for (const ... of ...)` instead of `.forEach`.
  - Use specific number methods (e.g., `Number.parseFloat`).
  - Keep `else` on the same line as closing curly braces.
  - Always use curly braces for multi-line `if` statements.

# 4. TypeScript Standards
- **Strictness:** NEVER use `any`. Use `unknown` if necessary, but prefer strict typing.
- **Imports:**
  - Import types separately.
  - **Pattern:**
    ```typescript
    import type { Foo } from 'bar';
    import { foo } from 'bar';
    ```
- **Utilities:** Use utility types like `PartialWithId<T>` to reduce redundancy.

# 5. React & Next.js Guidelines
- **Component Architecture:**
  - Favor **React Server Components (RSC)**. Minimize `use client`.
  - Use functional components with hooks.
  - Prefer composition (children prop) over inheritance.
- **Hooks:**
  - Follow strict Rules of Hooks.
  - Minimize `useEffect` and `useState`; prefer derived state or React Query.
  - **Custom Hooks:**
    - Focus on single CRUD operations.
    - Return structure: `{ data, setData, operation }`.
    - Define query keys as constants at top-level.
- **Performance:**
  - Use `React.memo`, `useCallback`, and `useMemo` specifically for expensive computations or prop stability.
  - Avoid inline function definitions in JSX.
  - Wrap client components in `Suspense` with fallbacks.

# 6. State Management (Local-First)
- **Global:** Use **Zustand**.
- **Data/Server:**
  - Use **React Query** combined with **IndexedDB**.
  - All data changes must be saved to IndexedDB and synced to API.
  - Use optimistic updates and invalidate queries on success.
- **Forms:** Use **React Hook Form** with **Zod/Joi** validation.

# 7. UI & Styling
- **Approach:** Mobile-first, Responsive.
- **CSS:**
  - Use **Tailwind CSS** for utilities.
  - Use **CSS Modules** for complex, non-utility styles.
  - **Forbidden:** Do NOT use the `@apply` directive.
- **Accessibility:**
  - Use semantic HTML (avoid `div` soup).
  - Ensure ARIA attributes and keyboard navigation.

# 8. Error Handling
- **Pattern:**
  - Handle errors early with guard clauses.
  - Put the "happy path" last.
  - Avoid `else` blocks where an early return works.
- **Server Actions:** Model errors as return values.
- **Callbacks:** Always handle the `err` parameter in callbacks.

# 9. Testing (Vitest)
- Run with `bun run test`.
- Focus on critical paths and security boundaries (input sanitization).

## Overview
- **Monorepo** managed with Bun, Turbo, and Biome. Apps live in `apps/`, shared code in `packages/`.
- Major apps: `api` (Hono, tRPC, Drizzle, Supabase), `rocco` (React Router, tRPC, Supabase), `florin` (finance), `notes`, `cli`, `workers`.
- Shared packages: `data` (ORM/services), `utils`, `ui` (components), `ai`, `auth`, `types`, `tsconfig`.

## Developer Workflows
- **Install:** `bun install`
- **Build all:** `bun run build` (Turbo)
- **Dev all:** `bun run dev` or `turbo run dev --parallel`
- **Test all:** `bun run test` (Vitest)
- **Lint:** `bun run lint` (Biome)
- **Migrate DB:** `bun run db:migrate` (Drizzle)
- **App-specific:** use `bun run -C apps/<app> <script>` or app's package.json scripts.
- **CI:** See `.github/workflows/` for deploy and setup details. Bun 1.3+ required.

## Key Patterns & Conventions
- **Formatting:** Biome enforced (2-space, 100-char, single quotes, no semis, double quotes for JSX).
- **TypeScript:** Explicit types, never use `any`, import types separately (`import type { Foo}`).
- **React:** Functional components, hooks, minimize `useEffect`/`useState`, prefer RSC, custom hooks for API ops.
- **State:** Zustand (global), React Query + IndexedDB (data), optimistic updates, context for intermediate state.
- **Validation:** Use Zod for schemas.
- **Error Handling:** Early returns, guard clauses, log with context, user-friendly messages.
- **UI:** Tailwind, Shadcn, Radix UI, mobile-first, no `@apply`.
- **Testing:** Vitest, React Testing Library, coverage via `vitest run --coverage`.
- **Performance:** Route/code splitting, dynamic import, Suspense, lazy load images, cache queries.

## API & Data Flow
- **API:** `apps/api` exposes tRPC routers (see `src/trpc/index.ts`).
- **App Data:** Apps (e.g., `rocco`) use tRPC client (`~/lib/trpc/client`) and server (`~/lib/trpc/server`) for data access.
- **Auth:** Supabase Auth, with helpers in `~/lib/supabase/server` and `~/lib/supabase/client`.
- **Database:** Drizzle ORM, schema in `packages/data/src/db/schema/`.
- **Invites/Lists:** See `apps/rocco/app/lib/trpc/routers/lists.ts` for list/invite logic and patterns.

## Examples
- **tRPC usage:** `trpc.lists.getAll.useQuery()` in components, `createCaller(request)` for server loaders.
- **Supabase client:** `const { supabase } = createClient(request)` for SSR auth.
- **Shared services:** Import from `@hominem/data` for business logic.

## Project-Specific Notes
- **Source-only packages:** No build step in `packages/`; apps transpile directly.
- **Env vars:** Managed via Turbo (`turbo.json`), see `README.md` for required Supabase keys.
- **CI/CD:** Deploys via GitHub Actions, see `.github/workflows/`.

For more, see `CLAUDE.md`, and each app's `README.md`.
