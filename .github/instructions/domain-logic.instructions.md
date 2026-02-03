---
applyTo: 'apps/rocco/**, apps/finance/**, packages/data/**, packages/finance/**'
---

# Domain Logic Tactics

Rules
- Use stateless signed tokens for invite systems; verify at the gateway.
- Bind invites to workspace IDs and apply on successful auth.
- Prefer SQL views/materialized aggregates for expensive analytics.
- Pre-aggregate for fast UI; avoid heavy client-side aggregation.
- Encapsulate domain logic within the corresponding package.
- Export only minimal public surface via package `index.ts`.
