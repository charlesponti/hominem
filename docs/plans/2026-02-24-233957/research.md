# Research: Remove Explicit Any Usage

## Current Inventory (as of 2026-02-17)

### Scope
- **Search locations**: `apps/`, `packages/`, `services/`, `tools/`
- **File types**: `.ts`, `.tsx`

### Findings (Initial)

| Pattern | Count |
|---------|-------|
| `as any` | 86 |
| `: any` | 109 |
| **Total** | **195** |

### Category Breakdown

| Category | Examples |
|----------|----------|
| API response typing | `res.json()` without declared response type |
| React Query hooks | `initialData` typed as `any` |
| UI mapping | `map((x: any) => ...)` |
| Legacy/variable shapes | Multiple possible shapes using `as any` |
| Tests | `as any` to satisfy route/component typing |
| Drizzle ORM queries | Dynamic column access with `as any` |

### Key Files with Most Occurrences

- `packages/events/src/events.service.ts` - ~20 occurrences (dynamic ORM columns)
- `apps/rocco/app/lib/hooks/use-user.ts` - 6 occurrences (error handlers)
- `packages/env/src/create-client-env.ts` - 4 occurrences (globalThis access)
- `packages/env/src/create-server-env.ts` - 3 occurrences (globalThis access)


## Decision 1: Use schema-derived types for API inputs/outputs
**Decision:** Prefer Zod schema inference and exported contract types (`@hominem/hono-rpc/types`) to replace `any` in API clients and hooks.  
**Rationale:** Keeps data flow aligned with the single source of truth (DB schema → services → routes → clients), reduces drift, and matches repo rules.  
**Alternatives considered:**  
- Ad-hoc local interfaces in apps (rejected: duplicates and drifts).  
- Inline type assertions in UI (rejected: still unsafe and brittle).

## Decision 2: Use type guards for union/legacy shapes
**Decision:** Replace `as any` with explicit type guards or discriminated unions for legacy/variable data shapes.  
**Rationale:** Preserves runtime behavior while making narrowing explicit and testable.  
**Alternatives considered:**  
- Keep `as any` for quick fixes (rejected: violates strict typing objective).  
- Convert to `unknown` and cast blindly (rejected: hides errors).

## Decision 3: Use explicit generics for query hooks
**Decision:** Provide explicit generic types to `useHonoQuery` and related hooks, based on API response types.  
**Rationale:** Removes implicit `any` from data and `initialData` while improving editor inference.  
**Alternatives considered:**  
- Rely on inference from `res.json()` (rejected: often yields `any`/`unknown`).

## Decision 4: Replace `any` in tests with proper route/component types
**Decision:** Define helper types for React Router route config and component types to avoid `as any` in tests. Use `ComponentType` for route components. For complex mock setups, use eslint-disable with explanatory comment.  
**Rationale:** Keeps test code safer while acknowledging practical limitations of test mocking.  
**Alternatives considered:**  
- Suppress with lint ignores (rejected: should only be used for known library limitations).

## Decision 5: Enforce no-explicit-any via lint
**Decision:** Add/enable a lint rule to prohibit explicit `any` and `as any` in TS/TSX.  
**Rationale:** Prevents regressions after cleanup.  
**Alternatives considered:**  
- Rely on code review only (rejected: not enforceable).

## Decision 6: Keep runtime behavior stable
**Decision:** Refactors must not change runtime outputs; type enforcement uses parsing/guards, not logic changes.  
**Rationale:** The goal is safety without behavioral regressions.  
**Alternatives considered:**  
- Rewrite logic to fit types (rejected: beyond scope and riskier).

## Decision 7: Allow eslint-disable for known library limitations
**Decision:** Some libraries have known limitations where explicit `any` with eslint-disable is acceptable:
- **BullMQ + ioredis**: Connection types don't align perfectly
- **Vitest `importOriginal`**: Generic type parameter limitations
- **Complex test mocking**: React Router routes, TanStack Query hooks

**Rationale:** Some libraries have incomplete TypeScript support; blocking progress for these edge cases is counterproductive. Document the exceptions clearly.