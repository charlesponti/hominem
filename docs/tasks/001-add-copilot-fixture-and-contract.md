---
title: "Add sanitized Copilot fixture and import contract"
status: "todo"
priority: "high"
labels: [finance, copilot, test-fixture]
depends_on: []
blocks: ["003-implement-copilot-csv-parser.md"]
estimated_size: "S"
---

## Objective

Create a sanitized Copilot Money fixture and the canonical field contract used by the importer.

## Context

The real export contains multiple accounts and the columns `date`, `name`, `amount`, `status`, `category`, `parent category`, `excluded`, `tags`, `type`, `account`, `account mask`, `note`, and `recurring`. The raw export must not enter the repository.

## Requirements

- Create a small anonymized Copilot-shaped CSV fixture derived from the local export schema.
- Include multiple account groups, shared/repeated rows, posted and pending rows, all supported transaction types, excluded rows, tags, categories, notes, and recurring values.
- Include malformed-header and unknown-type fixtures.
- Document the exact required Copilot header set and supported enum values.

## Implementation Notes

- Keep the raw `~/Downloads/transactions.csv` local only.
- Preserve realistic row shapes without real names, account masks, notes, or financial values.
- The contract is Copilot-specific; do not add generic bank-header aliases.

## Acceptance Criteria

- [ ] No raw financial export is added to the repository.
- [ ] The fixture contains at least two accounts and repeated composite rows.
- [ ] The fixture exercises every supported Copilot field and transaction type.
- [ ] Parser tests can load the fixture without network, Redis, or Postgres.

## Testing

- Add fixture-loading coverage that asserts the expected headers and row count.

