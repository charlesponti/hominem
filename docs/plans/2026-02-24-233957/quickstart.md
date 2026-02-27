# Quickstart: Remove Explicit Any Usage

This guide explains how to execute the cleanup workflow to remove all `any` and `as any` usage across the monorepo while keeping strict typing.

## Prerequisites

- Bun and Node installed per repo requirements.
- Branch: `001-remove-any-types`
- Repo root: run commands from the monorepo root (do not `cd` into packages).

## High-Level Workflow

1. **Inventory**: Locate all `any`/`as any` usage.
2. **Classify**: Group issues by category (API contracts, hooks, UI mapping, tests, legacy data shapes).
3. **Replace**: Introduce explicit types, Zod schema inference, and type guards.
4. **Enforce**: Add/enable lint checks to prevent reintroduction.
5. **Verify**: Typecheck and run tests.

## Step-by-Step

### 1) Locate all `any` usage

Run a repo-wide search to list explicit `any` and `as any` occurrences.

Recommended commands:
- `rg "as\\s+any" apps packages services tools`
- `rg "\\bany\\b" apps packages services tools`

Record the file list and group them by area.

### 2) Classify each occurrence

Typical categories:
- **API response typing**: `res.json()` used without a declared response type.
- **React Query or custom hooks**: `initialData` typed as `any`.
- **UI mapping**: `map((x: any) => ...)` and related data transforms.
- **Legacy/variable shapes**: multiple possible shapes, often uses `as any`.
- **Tests**: `as any` to satisfy route or component typing.

### 3) Replace `any` with explicit types

Use these rules:
- **API contracts**: Import types from `@hominem/hono-rpc/types`.
- **Services**: Use `@hominem/db/schema/{domain}.types` where applicable.
- **Zod**: Infer types from schemas (`z.infer<typeof Schema>`).
- **Type guards**: Add `isX(value): value is X` for union/legacy shapes.
- **Hooks**: Provide explicit generics to `useHonoQuery`/`useHonoMutation`.

### 4) Enforce no-explicit-any

Add or enable a lint rule that prevents explicit `any` usage. Validate that the rule applies to:
- `apps/**`
- `packages/**`
- `services/**`
- `tools/**`

### 5) Verify

Run validation commands from the repo root:
- `bun run typecheck`
- `bun run test`
- `bun run check`

## Definition of Done

- Repo-wide search yields **zero** `any` or `as any` usage in production code.
- Typecheck passes across all packages and apps.
- Tests pass.
- A lint rule prevents explicit `any` in TS/TSX (with documented exceptions below).

## Known Exceptions

Some libraries have known limitations where `any` or eslint-disable is acceptable:

1. **BullMQ + ioredis**: The BullMQ queue worker/connection types don't fully align with ioredis Redis instances. Use `eslint-disable` with a comment explaining the limitation.

2. **Test mocks**: Complex test mocking utilities (especially React Router route components, TanStack Query hooks) may require `any` for mock setup. Use `ComponentType` for route components, and `eslint-disable` for mock return values.

3. **Vitest `importOriginal`**: When mocking modules with `vi.mock` and `importOriginal`, the generic type parameter may require `any`.

## Notes

- Keep runtime behavior unchanged.
- Prefer single source of truth for types (DB schema → services → routes → clients).
- Tests should follow the same standard where practical; use eslint-disable for known library limitations.