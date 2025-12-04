# Copilot Instructions for Hominem Monorepo

## Overview
- **Monorepo** managed with Bun, Turbo, and Biome. Apps live in `apps/`, shared code in `packages/`.
- Major apps: `api` (Fastify, tRPC, Drizzle, Supabase), `rocco` (React Router, tRPC, Supabase), `chat`, `notes`, `florin`, `cli`, `workers`.
- Shared packages: `data` (ORM/services), `utils`, `components`, `ai`, `types`, `tsconfig`.

## Developer Workflows
- **Install:** `bun install`
- **Build all:** `bun run build` (Turbo)
- **Dev all:** `bun run dev` or `turbo run dev --parallel`
- **Test all:** `bun run test` (uses Vitest)
- **Lint:** `bun run lint` (Biome)
- **Migrate DB:** `bun run db:migrate` (Drizzle)
- **App-specific:** use `bun run -C apps/<app> <script>` or app's `package.json` scripts.
- **CI:** See `.github/workflows/` for deploy and setup details. Bun 1.3+ required.

## Key Patterns & Conventions
- **Formatting:** Biome enforced (2-space, 100-char, single quotes, no semis, double quotes for JSX).
- **TypeScript:** Explicit types, never use `any`, import types separately (`import type { Foo }`).
- **React:** Functional components, hooks, minimize `useEffect`/`useState`, prefer RSC, custom hooks for API ops.
- **State:** Zustand (global), React Query + IndexedDB (data), optimistic updates, context for intermediate state.
- **Validation:** Use Zod or Joi for schemas.
- **Error Handling:** Early returns, guard clauses, log with context, user-friendly messages.
- **UI:** Tailwind, Shadcn, Radix UI, mobile-first, no `@apply`.
- **Testing:** Vitest, React Testing Library, coverage via `vitest run --coverage`.
- **Performance:** Route/code splitting, dynamic import, Suspense, lazy load images, cache queries.

## API & Data Flow
- **API:** `apps/api` exposes tRPC routers (see `src/trpc/index.ts`).
- **App Data:** Apps (e.g., `rocco`) use tRPC client (`~/lib/trpc/client`) and server (`~/lib/trpc/server`) for data access.
- **Auth:** Supabase Auth, with helpers in `~/lib/supabase/server` and `~/lib/supabase/client`.
- **Database:** Drizzle ORM, schema in `packages/data/db/schema.ts`.
- **Invites/Lists:** See `apps/rocco/app/lib/trpc/routers/lists.ts` for list/invite logic and patterns.

## Examples
- **tRPC usage:** `trpc.lists.getAll.useQuery()` in components, `createCaller(request)` for server loaders.
- **Supabase client:** `const { supabase } = createClient(request)` for SSR auth.
- **Shared services:** Import from `@hominem/data` for business logic.

## Project-Specific Notes
- **Source-only packages:** No build step in `packages/`; apps transpile directly.
- **Env vars:** Managed via Turbo (`turbo.json`), see `README.md` for required Supabase keys.
- **CI/CD:** Deploys via GitHub Actions, see `.github/workflows/`.

For more, see `CLAUDE.md`, `.cursor/rules/javascript.mdc`, and each app's `README.md`.
