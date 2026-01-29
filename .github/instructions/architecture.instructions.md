---
applyTo: '**'
---

---
applyTo: '**'
---

# Architecture Guide (index)

High-level navigation and canonical pointers for the project's architecture. This file is an index — it intentionally delegates detailed guidance to specialized instruction files.

Key principles (summary):
- Prefer explicit domain types; avoid `typeof app` inference.
- Use direct REST responses with HTTP status codes and canonical ApiResult patterns (`api-contracts.instructions.md`).
- Keep routes lightweight — validation/serialization lives at the edge, business logic in service packages.

Where to start:
- Backend: `.github/instructions/hono-rpc.implementation.instructions.md`
- API contracts and validation: `.github/instructions/api-contracts.instructions.md`
- Performance: `.github/instructions/performance-first.instructions.md`

Verification:
- Run `bun run typecheck` and `bun run test` after major architecture changes.
