# Data Model: Remove Explicit Any Usage

## Overview
This feature does not introduce new persisted entities. It documents the **conceptual type model** needed to remove all `any`/`as any` usages and enforce strict typing across the monorepo.

## Conceptual Entities

### 1) Typed API Contract
**Represents:** The canonical request/response shapes for API interactions.  
**Source of Truth:** `@hominem/db/schema` (services) and `@hominem/hono-rpc/types` (clients).

**Fields (conceptual):**
- `Request`: Structured inputs validated by Zod schemas.
- `Response`: Structured outputs with named types.

**Relationships:**
- `Typed API Contract` → consumed by `Client Hooks` and `UI Components`.

**Validation Rules:**
- All inputs are validated with Zod schemas.
- Response parsing uses schema inference or explicit contract types.

---

### 2) Client Hook Types
**Represents:** Typed hooks that fetch or mutate data (e.g., `useHonoQuery`).

**Fields (conceptual):**
- `queryKey`: Tuple of string literals.
- `responseType`: Named type from API contract.
- `initialData`: Typed and compatible with `responseType`.

**Relationships:**
- `Client Hook Types` ← depend on `Typed API Contract`.
- `Client Hook Types` → used by `UI Components`.

**Validation Rules:**
- Hooks must provide explicit generics when inference yields `any`.

---

### 3) UI View Model
**Represents:** Derived data shapes used by UI components after mapping.

**Fields (conceptual):**
- `id`: String identifier.
- `label/name`: User-facing label.
- `metrics`: Numeric aggregates or time series.

**Relationships:**
- `UI View Model` ← derived from `Client Hook Types`.

**Validation Rules:**
- Mapping functions must use explicit types and/or type guards.
- No `as any` casting in component mapping.

---

### 4) Legacy/Variable Shape Guard
**Represents:** Type guards for union or legacy shapes.

**Fields (conceptual):**
- `isX(value): value is X` guard functions.
- `normalize(value): NormalizedType`

**Relationships:**
- `Legacy/Variable Shape Guard` → supports `UI View Model`.

**Validation Rules:**
- Guards must be exhaustive where unions are used.
- Fallbacks must be typed (no `any` escape hatch).

---

### 5) Test Harness Types
**Represents:** Types used in tests to avoid `any` in route configs, loaders, or component mocks.

**Fields (conceptual):**
- `RouteConfig`
- `LoaderResult`
- `ComponentType`

**Relationships:**
- `Test Harness Types` ← mirror runtime types from app/router packages.

**Validation Rules:**
- No explicit `any` in tests.
- Prefer imported types from framework packages.

---

## Data Flow (Conceptual)

1. **DB Schema** → defines canonical data shapes.
2. **Service Layer** → uses schema-derived types.
3. **Route Layer** → validates with Zod and returns typed responses.
4. **Client Hooks** → declare explicit response types.
5. **UI Components** → map to view models with explicit types and guards.

## Notes
- This feature is type-system-only; no persistence changes.
- All `any` usage must be replaced by explicit types, schema inference, or type guards.