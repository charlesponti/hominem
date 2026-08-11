---
type: task
id: CROSS-LINK-02
title: Expose content-link API and metadata
status: ready
priority: high
team: api
project: cross-linking
labels:
  - api
  - rpc
  - inbox
estimate: L
assignee: unassigned
depends_on:
  - CROSS-LINK-01
blocks:
  - CROSS-LINK-03
  - CROSS-LINK-04
---

# Expose content-link API and metadata

Implement the typed versions of `POST /api/content/:kind/:id/link` and `GET /api/content/:kind/:id/links` using shared schemas and repository methods. Validate kind, UUIDs, target ownership, duplicate behavior, and self-links. Return title, preview, kind, ID, and deletion state sufficient for banners and inbox labels.

Extend `GET /api/inbox` and `GET /api/inbox/[kind]/[id]` only with optional backward-compatible link metadata. Keep links absent for unlinked records rather than returning empty noise. Add integration tests for both directions, duplicate requests, unauthorized access, missing targets, and response compatibility.
