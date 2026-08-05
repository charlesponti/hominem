---
title: "Materialize Copilot metadata and exclusion behavior"
status: "done"
priority: "high"
labels: [finance, copilot, tags, analytics]
depends_on: ["002-add-finance-import-columns.md", "009-confirm-frozen-import-plan-api.md", "010-implement-import-plan-persistence.md"]
blocks: ["012-build-import-worker.md", "016-add-import-integration-tests.md", "017-run-copilot-end-to-end-verification.md"]
estimated_size: "L"
---

## Objective

Preserve Copilot metadata natively where supported and ensure excluded transactions stay out of analytics.

## Context

Hominem uses tags as the canonical categorization system. Copilot recurring metadata has no first-class destination yet.

## Requirements

- Map Copilot `note` to transaction notes.
- Create or reuse hierarchical parent and child tags for category values.
- Attach Copilot tags to the imported transaction.
- Preserve every Copilot field in `providerPayload`.
- Persist `excluded` as the new transaction field.
- Update finance analytics and relevant queries to exclude `excluded = true` transactions.
- Preserve recurring values in provider payload without creating a recurring model.

## Implementation Notes

- Use existing tag path/slug behavior and user ownership rules.
- Make tag creation idempotent under repeated imports.
- Keep raw Copilot strings available even when native mapping succeeds.

## Acceptance Criteria

- [ ] Reimporting the same metadata does not create duplicate tags.
- [ ] Parent and child category tags are attached correctly.
- [ ] Notes and provider payload retain the original Copilot values.
- [ ] Excluded transactions remain queryable but are absent from analytics totals.
- [ ] Recurring metadata survives import without requiring a recurring schema.

## Testing

- Add integration tests for tag materialization, idempotent tags, provider payload fidelity, and excluded analytics behavior.

