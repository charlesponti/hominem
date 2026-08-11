---
type: task
id: CROSS-LINK-05
title: Verify cross-linking lifecycle and navigation
status: ready
priority: high
team: platform
project: cross-linking
labels:
  - integration
  - maestro
  - database
estimate: L
assignee: unassigned
depends_on:
  - CROSS-LINK-04
---

# Verify cross-linking lifecycle and navigation

Verify chat -> note and note -> chat creation, duplicate taps, both-direction queries, inbox metadata, detail banners, target navigation, deleted targets, unauthorized access, failed link creation, refresh/refetch, and back navigation. Assert database rows and API responses in integration tests. Add Maestro flows for both creation paths and linked navigation. Verify no existing unlinked chat/note behavior changes.

## Acceptance criteria

- Every success criterion in `02-cross-linking.md` has API/database and live-client evidence where applicable.
- Orphan/deleted-target behavior is proven.
- Migration and generated type checks pass.
- No test claims a link exists based only on a toast; query the resulting state.
