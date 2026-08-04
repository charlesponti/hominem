---
title: "Implement frozen row identity and import planning"
status: "todo"
priority: "high"
labels: [finance, copilot, deduplication]
depends_on: ["003-implement-copilot-csv-parser.md", "004-implement-account-group-resolution.md"]
blocks: ["006-add-import-state-and-queue-contract.md", "007-build-preflight-api.md", "009-confirm-frozen-import-plan-api.md", "010-implement-import-plan-persistence.md", "016-add-import-integration-tests.md"]
estimated_size: "L"
---

## Objective

Produce a deterministic, reviewable import plan that preserves legitimate repeated Copilot rows and deduplicates re-imports.

## Context

Copilot does not provide a source transaction ID. The local export contains repeated composite rows, so hashing fields alone would incorrectly collapse legitimate transactions.

## Requirements

- Normalize the Copilot row fields used for identity.
- Add an occurrence index among identical normalized rows.
- Derive a stable row identity from account identity, normalized row fields, and occurrence index.
- Derive `externalId` from the stable row identity and `source: 'copilot-money'`.
- Preserve every row as selected by default.
- Expose repeated-row candidates individually for preflight review.
- Accept explicit selected/deselected row identities from confirmation.
- Keep one working deduplication set across all batches.
- Return invalid rows, unresolved groups, selected inserts, and skipped duplicates separately.

## Implementation Notes

- Keep the planner pure and independent of persistence.
- Use normalized date, name, amount, status, type, category, parent category, tags, note, recurring, account identity, and occurrence index.
- The frozen plan must contain all normalized persistence data and the original provider payload.

## Acceptance Criteria

- [ ] Legitimate repeated rows receive distinct identities.
- [ ] Re-importing the same export produces no new selected rows.
- [ ] Deselecting one repeated row leaves other repeated rows selected.
- [ ] Identity does not depend on a database account UUID.
- [ ] Planning remains deterministic across retries and batch boundaries.

## Testing

- Add unit tests for repeated rows, partial re-imports, selected-row filtering, changed account mappings, and cross-batch deduplication.
