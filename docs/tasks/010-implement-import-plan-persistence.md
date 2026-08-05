---
title: "Persist frozen accounts and transactions"
status: "done"
priority: "high"
labels: [finance, database, transactions]
depends_on: ["002-add-finance-import-columns.md", "005-implement-row-identity-and-plan.md", "009-confirm-frozen-import-plan-api.md"]
blocks: ["011-materialize-copilot-metadata.md", "012-build-import-worker.md", "016-add-import-integration-tests.md"]
estimated_size: "XL"
---

## Objective

Apply a confirmed frozen plan to finance accounts and transactions with concurrency-safe, retry-safe writes.

## Context

Partial writes remain by design. Database uniqueness is the final transaction deduplication authority.

## Requirements

- Atomically find or create new accounts by user ID and `csv_import_key`.
- Resolve confirmed existing-account mappings with user ownership checks.
- Insert selected transactions in bounded batches.
- Use `ON CONFLICT (user_id, source, external_id) DO NOTHING`.
- Persist normalized dates, amounts, types, pending state, excluded state, notes, and provider payload.
- Return actual inserted, skipped, invalid, and failed counts.
- Make retrying any completed batch safe.

## Implementation Notes

- Keep row/account database types private and expose explicit DTOs.
- Use `runInTransaction` for account creation and each transaction batch.
- Never trust account IDs from the client without checking the authenticated user.

## Acceptance Criteria

- [ ] Two concurrent plans with the same new-account key produce one account.
- [ ] Reapplying a plan does not create duplicate transactions.
- [ ] A failed later batch leaves earlier rows intact and retryable.
- [ ] Cross-user account IDs cannot be used in a confirmed plan.
- [ ] Actual database counts are returned rather than predicted counts only.

## Testing

- Add database integration tests for concurrency, `ON CONFLICT`, ownership, partial failure, and retry behavior.

