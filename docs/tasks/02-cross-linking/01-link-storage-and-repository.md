---
type: task
id: CROSS-LINK-01
title: Add content links storage and repository access
status: ready
priority: urgent
team: database
project: cross-linking
labels:
  - database
  - migration
  - repository
estimate: L
assignee: unassigned
depends_on:
  - CROSS-LINK-00
blocks:
  - CROSS-LINK-02
---

# Add content links storage and repository access

## Scope

Create `app.content_links` with UUID primary key, source/target kind checks, source/target IDs, created timestamp, a unique source-target constraint, and indexes for both source and target lookup. Do not add cascade foreign keys; linked rows must remain queryable as deleted targets according to CROSS-LINK-00.

Add the repository DTO and methods for create-idempotently, list both directions, resolve metadata for live targets, and represent missing targets. Keep Kysely row types private and map rows explicitly.

## Acceptance criteria

- Migration has tested Up/Down markers and is idempotent under the repository migration workflow.
- Duplicate creation returns the approved existing/new result.
- Both source and target lookups are indexed and tested.
- Ownership is enforced when creating or reading links.
- Generated DB types are regenerated through the approved command, never hand-edited.
