---
title: Finance CSV Import — Architecture
status: planning
last_reviewed: 2026-08-03
supersedes: docs/finance-csv-import-architecture.md
---

# Finance CSV Import — Architecture

## 1. Background

Users need to import bank-export CSVs (up to ~30,000 transactions per file) into their finance account. The feature is partially scaffolded but not wired end-to-end:

| Layer | State |
|---|---|
| Frontend upload UI (`apps/finance/app/routes/import.tsx`) | Built. Drag/drop, per-file status list. |
| Frontend state/store (`apps/finance/app/lib/hooks/use-import-transactions-store.ts`) | Built. POSTs to `/api/finance/import`, expects WebSocket push updates. |
| Frontend WebSocket client (`apps/finance/app/store/websocket-store.ts`) | Built. Reconnecting WS client, pub/sub by message `type`. Connects with `?token=` query param — **no backend consumes this today** (see phase 2, task `08`). |
| Shared types (`packages/queues/src/types.ts`) | Built. `ImportTransactionsJob`, `JobStatus`, `JobStats`, `ImportRequestResponse`, etc. |
| Redis job-tracking helpers (`packages/queues/src/service.ts`) | Read/delete helpers exist. Job creation, status updates, cancellation flags, and publish helpers still need to be added. |
| BullMQ queue declaration (`packages/queues/src/index.ts`) | Built, but declared with only `{ connection }` — no `attempts`/`backoff`/concurrency configured anywhere in the repo for any queue. Nothing pushes to or consumes it. |
| **Core import engine** (parsing, account resolution, dedup planning) | **Missing — this is the design priority now, see §3.** |
| API route `POST /api/finance/import` | **Missing.** Deliberately deferred until the core engine is proven (§2). |
| Import worker | **Missing.** Deliberately deferred until the core engine is proven (§2). |
| WebSocket server | **Missing.** `services/api` runs Node + `@hono/node-server`, no WS upgrade wired up. |
| Dedup constraint | Already exists in the DB (see §3.4) — no new migration needed. |
| Job status durability | Redis only (by design — see §4.6). BullMQ state and the user-facing status record must be reconciled explicitly. |

## 2. Sequencing decision: core logic before plumbing

The transaction-import decision logic — parsing a CSV, deciding which account each row belongs to, and deciding which rows are duplicates — must be designed, implemented, and proven correct **as plain functions with no HTTP/Redis/BullMQ/Postgres dependency**, before any upload route, worker, or UI is built.

Why: the hard part of this feature isn't moving bytes around, it's the decisions ("is this the same account as last time?", "is this the same transaction as last time?"). Those decisions need to be testable by calling a function with a CSV fixture and a fixture "current state" (existing accounts, existing transactions) and asserting on the returned plan — not by spinning up Postgres/Redis/BullMQ/an HTTP server and uploading a file through a browser. Getting this wrong is a silent correctness bug (duplicate accounts cluttering a user's account list, duplicate transactions inflating their spending totals) that won't be caught by "it uploaded successfully."

This splits the whole feature into two phases:

- **Phase 1 — Core import engine** (tasks `01`–`03`): pure, dependency-free logic. Fully unit-testable today, with nothing else built yet. Must be nailed down — including the duplicate-account and duplicate-transaction guarantees — before phase 2 starts.
- **Phase 2 — App wiring** (tasks `04`–`13`): the DB-writing layer, API route, BullMQ worker, WebSocket server, and frontend integration, all of which just call into the already-proven phase 1 engine.

## 3. Phase 1 — Core import engine

All of this lives in `packages/finance/src/import/` (new), as pure functions: no DB client, no Redis, no queue — every dependency (existing accounts, existing transaction keys) is passed in as a plain in-memory value, and results come back as plain data (a "plan") rather than as side effects.

### 3.1 Pipeline shape

```
CSV buffer
  → parseCsv()              (task 01)  → ParsedFile { rows, invalidRows, metadata } | ParseFailure
  → resolveAccounts()        (task 02)  → ResolvedImport { groups, account drafts, failures }
  → computeImportPlan()      (task 03)  → ImportPlan { accountsToCreate, transactionsToInsert, skipped, invalidRows, stats }
```

Nothing in this pipeline touches Postgres/Redis. A later, much thinner task (`04`, phase 2) takes an `ImportPlan` and actually writes it to the database.

### 3.2 Core types

```ts
// packages/finance/src/import/types.ts

interface AccountSnapshot {
  id: string;
  mask: string | null;
  name: string;
  institutionId: string | null;
  provider: string | null;
}

interface AccountResolutionFailure {
  line: number | null;
  identifier: string | null;
  reason: string;
}

interface ParsedRow {
  line: number;
  postedOn: string;       // ISO date
  description: string | null;
  amount: string;         // normalized, signed decimal string
  transactionType: string;
  rawAccountLabel: string | null; // account identifier found in the CSV row, if any (mask or free-text label)
}

interface NewAccountDraft {
  tempId: string;          // links transactions to a not-yet-created account within one plan
  importKey: string;       // deterministic per-user key used by phase-2 find-or-create
  mask: string | null;
  name: string;
  provider: 'csv-import';
  institutionId: null;
}

interface TransactionDraft {
  accountId: string | null;      // set if resolved to an existing account
  accountTempId: string | null;  // set if resolved to a NewAccountDraft instead
  externalId: string;            // stable source-row identity; independent of DB account UUID
  source: string;                // e.g. 'csv-import'
  amount: string;
  postedOn: string;
  description: string | null;
  transactionType: string;
}

interface ImportPlan {
  accountsToCreate: NewAccountDraft[];
  transactionsToInsert: TransactionDraft[];
  skipped: number;                          // rows deduped against existing transactions
  invalidRows: { line: number; reason: string }[]; // capped, see task 01
  accountResolutionFailures: AccountResolutionFailure[]; // capped; failed groups are not inserted
  stats: JobStats; // packages/queues/src/types.ts shape
}
```

### 3.3 Account resolution — deciding which account, without duplicating accounts

See task `02` for full detail. The engine groups rows by a normalized account fingerprint, matches that fingerprint against the user's accounts, and emits at most one `NewAccountDraft` per unmatched fingerprint. If confidence is insufficient, the group is returned as an explicit resolution failure and is not inserted. There is no best-guess write path.

**The no-duplicate-accounts guarantee**: `importKey` is deterministic for the user-visible source/account identity and is persisted with the account. Phase 2 must atomically find-or-create by that key. Re-importing a second file from the same source must resolve to the existing account, including when two imports race.

### 3.4 Dedup — deciding which transactions, without duplicating transactions

See task `03` for full detail. The DB already enforces a unique index on `(user_id, source, external_id)` (`packages/db/migrations/20260326181200_create_app_finance_indexes_and_constraints.sql:96-97`) — no new migration is needed for transaction dedup. `external_id` must be derived from stable source-row fields and the stable account `importKey`, never from a temporary ID or database account UUID. The DB constraint remains the final concurrency backstop.

**The no-duplicate-transactions guarantee**: re-running `computeImportPlan` with the *same* CSV against the state produced by applying the first run's plan must yield `transactionsToInsert: []` and `skipped` equal to the row count. This is the single most important test in the whole feature and must pass before phase 2 starts.

### 3.5 What phase 1 deliberately does NOT do

- Does not talk to Postgres, Redis, or BullMQ.
- Does not decide *how* a plan gets applied transactionally (that's task `04`'s problem — e.g. what happens if creating an account succeeds but the transaction batch insert fails partway).
- Does not handle HTTP upload, job status, or progress reporting (phase 2).

## 4. Phase 2 — App wiring

### 4.1 Apply plan to DB (task `04`)

The apply layer must run account resolution and account persistence under an atomic find-or-create operation keyed by `importKey`, then batch-insert transactions with `ON CONFLICT (user_id, source, external_id) DO NOTHING`. Account creation cannot rely on “one draft per plan” because concurrent jobs can carry identical drafts.

### 4.2 Upload route (task `05`)

`POST /api/finance/import/preflight` — accepts one Copilot Money CSV, validates and parses it, groups rows by Copilot account, resolves only confident exact matches, and stores a seven-day preflight plus proposed plan in Redis.

`POST /api/finance/import/preflight/:preflightId/confirm` — accepts explicit per-group account mappings and selected row identities, freezes the plan, and creates exactly one background job. The worker receives the frozen plan reference and never reparses or re-resolves the file.

### 4.3 Jobs route (task `06`)

`GET /api/finance/import/jobs` — reads only the authenticated user's sorted job index. The global active-job set must never be returned directly to a user.

### 4.4 Worker (task `07`)

BullMQ consumer reads the frozen plan from Redis and applies selected transaction batches (~500 rows) while carrying one deduplication set across all batches. It does not parse, resolve accounts, or mutate the confirmed selection. Progress is reported after each applied batch.

### 4.5 WebSocket server (task `08`)

New WS upgrade endpoint at `/api/finance/import/ws`. Authenticate using the existing Better Auth session cookie on the upgrade request; do not accept a query-string token. Snapshots and progress are filtered to the authenticated user's jobs.

### 4.6 Why Redis-only, no Postgres jobs table

Job status/progress is ephemeral UX state — the imported transactions are the durable artifact. BullMQ's own queue already lives entirely in Redis, so a Postgres shadow table wouldn't add real durability, only a second write path that can drift from the first. The Redis service must provide one authoritative user-facing status record, with explicit reconciliation from BullMQ failure/stall events.

### 4.7 Frontend (tasks `09`–`11`)

Hydrate on mount from the jobs route, key state by `jobId` not `fileName`, add real cancellation (queued job removed from the queue; in-progress job stops between batches via a checked flag).

### 4.8 Shared contract alignment

Before phase 2 implementation, update `packages/queues/src/types.ts` and all consumers together:

- remove `deduplicateThreshold` and request-level `accountId` from the import contract;
- add `cancelled` to `JobStatus`;
- define the authoritative job record fields used by Redis, BullMQ, WebSocket messages, and the frontend;
- add queue-service helpers for job creation, status updates, cancellation requests, file storage, and progress publication.

The current queue types and Redis service do not yet expose this final contract.

## 5. Resolved decisions

- **D1 (dedup semantics)** — resolved: exact-match dedup via a synthesized `external_id`, not fuzzy matching. The existing `deduplicateThreshold` field in the frontend contract is superseded by this — it should be removed from the UI/request contract during task `09`/`10` rather than wired to anything, since there's no fuzzy-matching mechanism behind it.
- **D2 (account selection)** — resolved: exact confident matches may be automatic; unresolved groups require a per-group existing-account picker or explicit new-account creation.
- **D3 (WS auth mechanism)** — resolved: Better Auth session cookie on the upgrade request; no query-string token. Task `08` must validate the cookie behavior in the deployed origin configuration.

## 6. Plan-review findings still tracked

From the earlier review pass, several findings remain relevant to specific tasks and are noted on those task docs directly rather than repeated here: sign-convention/`transactionType` mapping (task `03`), header-mapping edge cases — encoding, preamble rows, parenthesized negatives (task `01`), upload size limits (task `05`), no retry policy configured on any queue (task `07`), two independent job-state stores that can drift (task `07`), default worker concurrency of 1 serializing all users' imports (task `07`), reconnect needing a state snapshot (task `08`).
