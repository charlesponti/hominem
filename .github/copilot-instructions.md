# Hominem Copilot Instructions

Hominem is a monorepo full-stack application with local-first architecture.

For detailed coding guidelines, see specialized instruction files in `.github/instructions/`:

- **All files:** `AGENTS.md` is the canonical source for universal engineering rules. See `AGENTS.md` and per-area instruction files in `.github/instructions/` for specifics.
- **React components:** [react.instructions.md](instructions/react.instructions.md)
- **API development:** [api.instructions.md](instructions/api.instructions.md)
- **Database code:** [database.instructions.md](instructions/database.instructions.md)

## Project Overview

Hominem is a monorepo full-stack application with local-first architecture. It uses Bun, Next.js (App Router), Drizzle ORM, Zustand, React Query + IndexedDB, Tailwind CSS, Shadcn UI, and Vitest.

## Architecture

- **Monorepo Structure**: Apps in `apps/`, shared packages in `packages/`.
- **API**: `apps/api` exposes tRPC routers via Hono.
- **Frontends**: `apps/rocco` (React Router), `apps/florin` (finance), `apps/notes`.
- **Data**: Drizzle schemas in `packages/db/src/db/schema/`, lazy initialization.
- **State**: Zustand for global state, React Query + IndexedDB for server/local-first data.
- **Auth**: Supabase Auth with helpers in `packages/auth`.

## Key Workflows

- **Install:** `bun install`
- **Dev:** `bun run dev` (turbo)
- **Build:** `bun run build --force` (turbo)
- **Test:** `bun run test --force` (turbo)
  - Test specific package: `bun run test --filter <package_name>` (eg. `bun run test --filter @hominem/finance`)
- **Lint:** `bun run lint --parallel` (oxlint)
- **Database:**
  - Modify schema: Edit `packages/db/src/db/schema/*`
  - Generate migrations: `bun run db:generate`
  - Apply migrations: `bun run db:migrate`
- **scripts**
  - Use `bun run -f <package> <script>` to run package-specific scripts.
  - Do not `cd` into packages; use Turbo commands from the monorepo root.

## Quick Reference

- 2 spaces, no semicolons, single quotes (code), double (JSX)
- Naming: camelCase (vars/fns), PascalCase (components), `is/has` booleans

## Quick Reference

### Code Style

- 2 spaces, no semicolons, single quotes (code), double quotes (JSX)
- Naming: `camelCase` (vars/fns), `PascalCase` (components), `is/has` (booleans)
- TypeScript: No `any`, import types separately
- Error handling: Early returns, guard clauses, no `else` after return

### Tech Stack Summary

- **Runtime:** Bun
- **web framework:** React Router (`apps/*`)
- **server:** Hono + tRPC (`services/api`)
- **Database:** Drizzle ORM + PostgreSQL (`packages/db`)
- **Auth:** Supabase Auth (`packages/auth`)
- **State:** React Query + IndexedDB (server/local-first)
- **UI:** Tailwind CSS, Shadcn UI, Radix UI
- **Validation:** Zod
- **Testing:** Vitest, React Testing Library

### Common Patterns

- **Hono RPC Client:** `client.api.resource.operation.$post()` or use `useHonoQuery` / `useHonoMutation` (from `@hominem/hono-client/react`)
- **Server:** call services directly or use server-side Hono handlers; prefer direct service calls in loaders for performance
- **Auth:** Import from `@hominem/auth`
- **Data:** Import from `@hominem/db`
- **Utils:** Import from `@hominem/utils`
- **Forms:** React Hook Form + Zod validation
- **Data Flow:** IndexedDB → React Query → API sync
