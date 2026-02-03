# Engineering Guidelines (Reference)

This document contains reference details that are not strict global rules. The canonical rules live in `AGENTS.md` and scoped rules in `.github/instructions/`.

## Tech Stack

- Runtime: Bun (>=1.1.0), Node.js (>=20)
- Web: React 19, React Router 7, Tailwind CSS
- Server: Hono, tRPC, Supabase Auth
- Database: Drizzle ORM, PostgreSQL
- Validation: Zod
- Tools: oxlint, oxfmt

## API Preferences

- Use Hono + tRPC patterns defined in `.github/instructions/api-engineering.instructions.md`.
- Use `useHonoQuery` / `useHonoMutation` in client code.

## Type Performance Tools

- `bun run type-performance:audit`
- `bun run type-performance:diagnose -- --package <pkg>`
- `bun run type-performance:dashboard -- --audit-first --open`
- `bun run type-performance:tsserver -- --logfile <path>`

## Imports

- Use path aliases from `tsconfig.base.json` for internal packages.
- Prefer direct schema/type imports per `.github/instructions/type-architecture.instructions.md`.
