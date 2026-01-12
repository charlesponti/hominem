# Hominem Copilot Instructions

## Project Overview
Hominem is a monorepo full-stack application with local-first architecture. It uses Bun, Next.js (App Router), Drizzle ORM, Zustand, React Query + IndexedDB, Tailwind CSS, Shadcn UI, and Vitest.

## Architecture
- **Monorepo Structure**: Apps in `apps/`, shared packages in `packages/`.
- **API**: `apps/api` exposes tRPC routers via Hono.
- **Frontends**: `apps/rocco` (React Router), `apps/florin` (finance), `apps/notes`.
- **Data**: Drizzle schemas in `packages/data/src/db/schema/`, lazy initialization.
- **State**: Zustand for global state, React Query + IndexedDB for server/local-first data.
- **Auth**: Supabase Auth with helpers in `packages/auth`.

## Key Workflows
- **Install**: `bun install`
- **Dev**: `bun run dev` (Turbo parallel)
- **Build**: `bun run build` (Turbo)
- **Test**: `bun run test --force` (Vitest)
- **Lint**: `bun run lint --parallel` (Biome)
- **DB**: Edit `packages/data/src/db/schema/*`, run `bun run db:generate`, `bun run db:migrate`

## Code Style (Biome)
- 2 spaces, no semicolons, single quotes (code), double (JSX)
- Naming: camelCase (vars/fns), PascalCase (components), `is/has` booleans
- Strict TypeScript: no `any`, use `unknown` or strict types
- Imports: types separate, e.g., `import type { Foo } from 'bar'; import { foo } from 'bar';`

## React Patterns
- Prefer RSC, minimize `use client`
- Hooks: custom for CRUD, return `{ data, setData, operation }`
- State: optimistic updates, invalidate on success
- Forms: React Hook Form + Zod
- Error: early returns, guard clauses, no `else`

## Examples
- tRPC: `trpc.lists.getAll.useQuery()` in components
- DB: `import { db } from '@hominem/data/db'`
- UI: Shadcn components from `@hominem/ui`

## Conventions
- Local-first: save to IndexedDB, sync to API
- Validation: Zod schemas
- Testing: Vitest, focus on critical paths
- UI: mobile-first, semantic HTML, no `@apply`</content>
<parameter name="filePath">/Users/charlesponti/Developer/hominem/.github/copilot-instructions.md