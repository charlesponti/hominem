# Hominem Constitution

## Core Principles

### I. Strict Typing (Non-Negotiable)
No `any` or `unknown` in TypeScript. Types must be explicit, derived from schema/contracts, and enforced throughout production and test code.

### II. Single Source of Truth for Types
Database schema types are canonical. Data flow is one-way: DB schema → services → routes → clients. Do not redefine DB types; extend with intersections when needed.

### III. Validation First
All external inputs must be validated with Zod schemas. Schemas are reused between service and route layers.

### IV. Clean Architecture Boundaries
Apps never access the database directly. Only the API layer accesses `@hominem/db`. Apps must use RPC client types and APIs.

### V. Security by Default
External inputs are validated and sanitized. Parameterized DB queries are required. No internal error details are exposed to users.

## Quality Gates

### Required Checks Before Merge
- `bun run typecheck`
- `bun run lint --parallel`
- `bun run test`
- `bun run validate-db-imports`

### Additional Enforcement
- Lint rules must block explicit `any` usage.
- Tests must compile and pass without type suppressions.

## Workflow Rules

### Review Policy
- Minimum 1 reviewer for changes affecting shared packages, services, or public API contracts.
- API contract changes require review from an API owner.

### Migration Policy
- Database schema changes must follow: `db:generate` → `db:migrate` workflow.
- SQL migration files are never edited manually.

### Release & Versioning
- Breaking changes must be explicitly documented and approved.
- Favor incremental, focused changes over sweeping rewrites.

## Specialized Rules

- Use `import type` for type-only imports.
- Avoid inline JSX callbacks; use semantic HTML and accessible interactions.
- Use `useHonoQuery` / `useHonoMutation` in client code.
- Services are framework-agnostic and throw typed errors.
- Routes validate inputs, map errors to HTTP status codes, and return ApiResult envelopes.

## Governance

This constitution supersedes all other practices. All plans, tasks, and reviews must verify compliance. Any exception requires a documented justification and a migration plan to restore compliance.

**Version**: 1.0.0 | **Ratified**: 2026-02-17 | **Last Amended**: 2026-02-17