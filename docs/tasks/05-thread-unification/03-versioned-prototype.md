---
type: task
id: THREAD-V2-03
title: Prototype unified thread API and detail surface
status: ready
priority: high
team: platform
project: thread-unification
labels:
  - prototype
  - api
  - mobile
estimate: XL
assignee: unassigned
depends_on:
  - THREAD-V2-01
blocks:
  - THREAD-V2-04
---

# Prototype unified thread API and detail surface

Build a non-production prototype behind an explicit feature flag or isolated branch using versioned `/api/v2/threads` contracts. Prove read/create/send/update-document/link behavior for chat-only, note-only, and hybrid fixtures. Prototype `ThreadDetailScreen`, `useThread`, `useThreads`, and `ThreadStreamItem` without deleting or rewriting current chat/note components.

Measure message-list/editor mounting, mode transitions, deep-link routing, cache invalidation, and accessibility on the smallest supported iPhone. Record every behavior that cannot be expressed without reintroducing kind branching.

## Acceptance criteria

- The prototype demonstrates the directional model with real typed API data.
- Existing v1 chat/note flows remain untouched and pass their tests.
- Performance and missing-feature gaps are documented for the go/no-go review.
