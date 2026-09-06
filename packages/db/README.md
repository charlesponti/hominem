# @hominem/db — public surface

This package exposes compiled runtime and types only. Do NOT import source files from `@hominem/db/src`.

Public surface (what consumers may import):

- `@hominem/db/ai`, `/career`, `/chats`, `/core`, `/errors`, `/files`, `/finance`, `/notes`, `/tasks`, `/types`, `/transaction`, and `/vector` — explicit entry points for new imports
- `@hominem/db/schema/*` — compiled schema objects (`build/schema/*.schema.js`)
- `@hominem/db/types/*` — type-only imports (TypeScript declarations in `build/schema/*.types.d.ts`)

Migration notes

- Replace `import type { X } from '@hominem/db/schema/...'` with `import type { X } from '@hominem/db/types/...'` for purely type imports.
- Do not deep-import `@hominem/db/src/*` — those paths are internal and not exported.

Prefer an explicit entry point for new imports, for example:

```ts
import { TaskRepository } from '@hominem/db/tasks';
import { db } from '@hominem/db/core';
import type { AppTasks } from '@hominem/db/types';
```

Migration naming and organization

- Keep Goose migrations flat and chronological. Use the timestamp prefix for execution order and the suffix for meaning.
- Prefer one concern per file. If a migration mixes schema creation, backfills, index creation, policy wiring, and trigger logic, split it.
- Use a consistent pattern: `YYYYMMDDHHMMSS_<domain>_<change>.sql`.
- Organize the sequence by phase:
  - bootstrap: schemas, extensions, and shared helper functions
  - auth: Better Auth tables and auth-context helpers
  - domain tables: notes, people/work, places/calendar/travel, finance, media, and inventory/ops
  - domain indexes and constraints
  - cross-cutting relational primitives: entity registry, space items, membership windows, and tag model
  - RLS and performance: policies, search storage, and index tuning
- Avoid vague or editorial names such as "hardcore" or "enrich". Prefer names that describe the schema effect.
- Examples from this branch that fit the convention better:
  - `20260326180000_bootstrap_core_schemas_and_extensions.sql`
  - `20260326180200_create_shared_timestamp_and_auth_context_functions.sql`
  - `20260326181800_add_time_windowed_relationships_and_access_rules.sql`
  - `20260326182100_rename_primary_spaces_and_create_space_items.sql`
  - `20260326182300_add_tag_hierarchy_aliases_and_assignment_metadata.sql`

Rationale

Keeping the package restricted to compiled outputs prevents accidental coupling to source files and makes the public API explicit and stable.
