---
title: "Implement the Copilot CSV parser"
status: "todo"
priority: "high"
labels: [finance, copilot, parser]
depends_on: ["001-add-copilot-fixture-and-contract.md"]
blocks: ["004-implement-account-group-resolution.md", "005-implement-row-identity-and-plan.md"]
estimated_size: "L"
---

## Objective

Parse one bounded Copilot CSV into validated, normalized rows without external services.

## Context

Copilot exports multiple accounts in one file. The importer must preserve the original row payload while producing Hominem-ready values.

## Requirements

- Accept a bounded CSV buffer and return a `ParsedFile` or top-level `ParseFailure`.
- Require the Copilot header contract from task 001.
- Parse dates, amounts, booleans, status, type, account label, and account mask.
- Normalize whitespace and account masks deterministically.
- Preserve every original Copilot field in each parsed row.
- Normalize `regular`, `income`, and `internal transfer`; reject unknown types as row-level failures.
- Preserve pending state, excluded state, tags, categories, notes, and recurring values.
- Cap invalid-row details and distinguish malformed files from invalid rows.

## Implementation Notes

- Place the pure parser under `packages/finance/src/import/`.
- Use the existing `csv-parse` dependency.
- Support BOM and CRLF input.
- Enforce the upload-size limit at the API boundary; the parser still validates its received buffer.

## Acceptance Criteria

- [ ] The sanitized fixture parses into the expected number of rows and account groups.
- [ ] Unknown headers and unknown transaction types fail with actionable errors.
- [ ] Amount and type values remain exact decimal values until persistence.
- [ ] The parser has no DB, Redis, BullMQ, HTTP, or frontend dependency.

## Testing

- Add unit tests for the fixture, BOM, CRLF, malformed CSV, missing headers, invalid rows, booleans, amounts, and unknown types.

