---
name: type-architecture
description: Use for schema, type flow, TypeScript project graph, and tsconfig decisions across apps, packages, and services.
---

# Type Architecture

## Source Of Truth

- Database types are the single source of truth.
- Keep data flow one-way: DB schema -> services -> routes -> clients.
- Import tables from `@hominem/db/schema/{domain}`.
- Import types from `@hominem/db/schema/{domain}.types`.
- Do not use barrel imports from `@hominem/db/schema`.
- Do not redefine DB types; extend with intersections when needed.
- Use Zod schemas for validation and derive from DB schema when possible.

## TypeScript Baseline

- Keep root solution references in `tsconfig.json`.
- Keep `disableReferencedProjectLoad: true` and `disableSolutionSearching: true` in `tsconfig.json` for tsserver performance.
- Use `composite: true` for referenced workspace projects.
- Prefer declaration boundaries with `disableSourceOfProjectReferenceRedirect: true`.
- Use `moduleResolution: 'Bundler'` for Bun, Vite, and Expo targets.
- Keep `baseUrl` and `paths` only when actively needed.
- Keep `include` tight to real source and config files.
- Use `moduleDetection: 'force'`, `verbatimModuleSyntax: true`, and `isolatedModules: true`.

## Validation

```bash
npx tsc -b tsconfig.json --pretty false
bun run typecheck
bun run check
```
