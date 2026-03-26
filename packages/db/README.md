# @hominem/db

This package exposes compiled runtime and types only. Do NOT import source files from `@hominem/db/src`.

Public surface:

- `@hominem/db` — runtime API (compiled `build/index.js`) and types (`build/index.d.ts`)
- `@hominem/db/schema/*` — compiled schema objects (`build/schema/*.schema.js`)
- `@hominem/db/types/*` — type-only imports (TypeScript declarations in `build/schema/*.types.d.ts`)

Migration notes

- Replace `import type { X } from '@hominem/db/schema/...'` with `import type { X } from '@hominem/db/types/...'` for purely type imports.
- Do not deep-import `@hominem/db/src/*` — those paths are internal and not exported.

Rationale

Keeping the package restricted to compiled outputs prevents accidental coupling to source files and makes the public API explicit and stable.

Database workflow

- Goose is the only migration runner.
- The workflow rebuild is documented in [docs/database-management-rebuild.md](/Users/charlesponti/Developer/hominem/docs/database-management-rebuild.md).
- Use root commands from [Makefile](/Users/charlesponti/Developer/hominem/Makefile) for migrate, reset, status, type generation, and fresh-database verification.
