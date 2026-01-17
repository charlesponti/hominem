# Hominem Copilot Instructions

Hominem is a monorepo full-stack application with local-first architecture.

For detailed coding guidelines, see specialized instruction files in `.github/instructions/`:

- **All files:** [principles.instructions.md](instructions/principles.instructions.md) - Universal coding standards
- **React components:** [react.instructions.md](instructions/react.instructions.md) - Component patterns & state management
- **API development:** [api.instructions.md](instructions/api.instructions.md) - tRPC, authentication, endpoints
- **Database code:** [database.instructions.md](instructions/database.instructions.md) - Drizzle ORM, migrations, queries

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
- **Dev:** `bun run dev` (Turbo)
- **Build:** `bun run build --force` (Turbo)
- **Test:** `bun run test --force` (Vitest)
- **Lint:** `bun run lint --parallel` (Biome)
- **Database:**
  - Modify schema: Edit `packages/db/src/db/schema/*`
  - Generate migrations: `bun run db:generate`
  - Apply migrations: `bun run db:migrate`

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
- **Framework:** React Router (rocco, florin, notes)
- **API:** Hono + tRPC
- **Database:** Drizzle ORM + PostgreSQL (Supabase)
- **Auth:** Supabase Auth
- **State:** Zustand (global), React Query + IndexedDB (server/local-first)
- **UI:** Tailwind CSS, Shadcn UI, Radix UI
- **Validation:** Zod
- **Testing:** Vitest, React Testing Library

### Common Patterns

- **tRPC Client:** `trpc.resource.operation.useQuery()` or `.useMutation()`
- **tRPC Server:** `createCaller(request).resource.operation(input)`
- **Auth:** Import from `@hominem/auth`
- **Data:** Import from `@hominem/db`
- **Utils:** Import from `@hominem/utils`
- **Forms:** React Hook Form + Zod validation
- **Data Flow:** IndexedDB → React Query → API sync
