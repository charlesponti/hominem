---
title: "Add finance import identity and exclusion columns"
status: "todo"
priority: "high"
labels: [finance, database, migration]
depends_on: []
blocks: ["004-implement-account-group-resolution.md", "010-implement-import-plan-persistence.md", "011-materialize-copilot-metadata.md"]
estimated_size: "M"
---

## Objective

Add database support for stable Copilot account identity and excluded transactions.

## Context

Concurrent imports need an atomic account find-or-create key. Analytics must exclude Copilot rows marked `excluded` without unpacking JSON in every query.

## Requirements

- Add nullable `csv_import_key` to `app.finance_accounts`.
- Add a per-user unique partial index for non-null `csv_import_key` values.
- Add non-null `excluded boolean` to `app.finance_transactions`, defaulting to `false`.
- Update generated database types through the repository database workflow.
- Preserve existing transaction and account constraints.

## Implementation Notes

- Use a Goose migration with `Up` and `Down` sections.
- Keep `csv_import_key` nullable so Plaid and manually-created accounts remain compatible.
- Run `just db migrate` and `just db codegen` with an explicit `DATABASE_URL`.

## Acceptance Criteria

- [ ] The migration applies twice without failure.
- [ ] Two accounts for one user cannot share a non-null CSV import key.
- [ ] Existing accounts and transactions remain valid after migration.
- [ ] Generated Kysely types expose both new fields.

## Testing

- Add database integration coverage for the unique per-user import key and excluded default.

