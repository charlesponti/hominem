---
applyTo: 'apps/api/**'
---

# API Development Guidelines

This file contains *app-specific* notes for the API app. Repository-wide canonical guidance lives in the files below — please follow them instead of duplicating rules or examples here.

**Canonical sources (authoritative):**

- `.github/instructions/api-architecture.instructions.md` — high-level API & types-first architecture and route/service responsibilities
- `.github/instructions/api-contracts.instructions.md` — detailed contract rules: errors, Zod schemas, `ApiResult` envelopes, HTTP translation, and testing patterns

## App-specific checklist (short)

- Use Hono for routing and tRPC for RPC endpoints where appropriate.
- Keep route handlers thin: validate inputs (Zod), call service functions, map typed service errors to the appropriate HTTP status and `ApiResult` error envelope.
- Services should be framework-agnostic and throw typed errors (see `@hominem/services` error types).
- Serialize `Date` to ISO strings in the route layer to avoid hydration mismatches.
- Keep domain types central (`@hominem/db/schema`) and import them where needed.

> For examples, implementation patterns, and exhaustive rules, consult `.github/instructions/api-contracts.instructions.md` and `.github/instructions/api-architecture.instructions.md`. Do not copy-and-paste long examples here — link to the authoritative docs.

---

**Apply this file to:** `apps/api/**` — keep this file short and focused on app-level notes only.
