---
applyTo: 'packages/**, services/api/**, apps/**'
---

# Type Architecture - Single Source of Truth

- Database types are the single source of truth.
- Keep data flow one-way: DB schema -> services -> routes -> clients.
- Import tables from `@hominem/db/schema/{domain}`.
- Import types from `@hominem/db/schema/{domain}.types`.
- Do not use barrel imports from `@hominem/db/schema`.
- Do not redefine DB types; extend with intersections when needed.
- Use Zod schemas for validation and derive from DB schema when possible.
