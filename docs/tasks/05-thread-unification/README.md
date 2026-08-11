---
type: project-index
status: exploratory
priority: low
team: platform
project: thread-unification
labels:
  - architecture
  - migration
  - threads
source: ../05-thread-unification.md
---

# Full Thread Unification

This proposal is directional and explicitly not ready for implementation. These documents define the discovery and approval work required before a migration ticket can exist. Do not create `app.threads`, rewrite `/api/inbox`, or delete `app.chats`/`app.notes` from this idea alone.

## Required order

1. `THREAD-V2-00`: inventory current chat/note contracts and dependent features.
2. `THREAD-V2-01`: produce an approved thread data model and invariants.
3. `THREAD-V2-02`: produce migration, rollback, and dual-read/write plan.
4. `THREAD-V2-03`: prototype the unified detail/inbox client against a versioned API.
5. `THREAD-V2-04`: product/architecture go-no-go review.
