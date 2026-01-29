---
applyTo: 'apps/**, packages/hono-rpc/**, services/api/**, packages/hono-client/**'
---

# API & Type Architecture

Establish type-safe, performant communication between services and applications by following the "Types-First" REST pattern.

### 1. Explicit Contracts over Inference

- **Tactical Goal:** Achieve sub-second type checking across all applications.
- **Action:** Define every API input and output as an explicit TypeScript `type` or `interface` in `packages/hono-rpc/src/types`.
- **Constraint:** NEVER infer the `AppType` from the implementation (e.g., `typeof app`). Apps must import domain-specific types directly (e.g., `import type { PlaceCreateOutput } from '...'`).

### 2. Standardized REST Boundaries

- **Tactical Goal:** Predictable HTTP semantic handling.
- **Action:** Use Hono for routing and standard HTTP status codes for error states (400, 401, 403, 404, 409, 500).
- **Format:** For canonical response envelopes and error mapping, see `.github/instructions/api-contracts.instructions.md`. At the route layer, return direct JSON payloads on success and map service errors to the appropriate HTTP status codes.
- **Serialization:** Explicitly handle `Date` serialization (to ISO strings) at the route layer to prevent hydration mismatches.

### 3. Service Layer Separation

- **Tactical Goal:** Framework-agnostic business logic.
- **Action:** Keep services as pure business logic that throw typed error instances (e.g., `new ConflictError()`).
- **Endpoint Responsibility:** The HTTP handler is responsible for catching service errors and translating them to the appropriate HTTP status codes and user-facing error messages.

### 4. Input Validation

- **Tactical Goal:** Zero-trust input handling.
- **Canonical:** For input validation and ApiResult envelope rules, see `.github/instructions/api-contracts.instructions.md`.
