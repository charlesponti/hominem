---
title: Finance CSV Import — Overview
status: planning
last_reviewed: 2026-08-03
---

# Finance CSV Import

This directory is the working plan for building the finance CSV import pipeline (bank-export CSVs, up to ~30,000 rows per file, processed as a background job with live progress).

- [`architecture.md`](./architecture.md) — full architecture, including the sequencing decision below.
- [`tasks/`](./tasks) — ordered, individually-tracked implementation tasks. Each has frontmatter (`order`, `phase`, `status`, `depends_on`, `blocked_by_decisions`, `area`).

## Two phases — build and prove phase 1 before starting phase 2

**Phase 1 — core import engine** (`tasks/01`–`03`): pure functions, no HTTP/Redis/BullMQ/Postgres. Parses a CSV, decides which account each row belongs to, and decides which rows are duplicates — all testable today with nothing else built, by calling functions with fixture CSVs and fixture "current state" (existing accounts, existing transaction keys). This must be nailed down — proven via the idempotency tests described in tasks `02` and `03` — before phase 2 starts.

**Phase 2 — app wiring** (`tasks/04`–`13`): the DB-writing layer, API route, BullMQ worker, WebSocket server, and frontend integration. All of this just calls into the already-proven phase 1 engine; none of it makes the hard decisions.

## Resolved decisions

- **D1 (dedup semantics)**: exact-match via a synthesized `external_id`, not fuzzy matching. `deduplicateThreshold` is dropped from the frontend contract (task `10`).
- **D2 (account selection)**: confident exact matches may resolve automatically; unresolved groups require a per-group existing-account picker or explicit new-account creation.
- **D3 (WS auth mechanism)**: resolved for planning — use the existing Better Auth session cookie on the upgrade request; remove the query-string token from the finance client. This remains subject to a deployment proof in task `08`.

## Revision gates

Phase 1 is not ready to start until the following invariants are specified in the task docs and covered by tests:

- transaction identity is stable before and after a newly-created account receives its database ID;
- account creation is atomic and idempotent under concurrent imports;
- uncertain account matches fail safely instead of silently attaching rows to a best guess;
- parsing and planning have one explicit memory/batching model, including duplicate detection across batch boundaries.

## Status legend

`blocked` (needs a decision or an earlier task) · `ready` · `in_progress` · `done`
