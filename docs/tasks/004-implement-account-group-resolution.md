---
title: "Implement Copilot account group resolution"
status: "done"
priority: "high"
labels: [finance, copilot, accounts]
depends_on: ["002-add-finance-import-columns.md", "003-implement-copilot-csv-parser.md"]
blocks: ["005-implement-row-identity-and-plan.md", "007-build-preflight-api.md"]
estimated_size: "L"
---

## Objective

Group Copilot rows by account and resolve each group to an existing account or an explicit user choice.

## Context

One Copilot file can contain many accounts. Exact normalized mask matching is primary; labels disambiguate shared masks. No fuzzy matching is allowed.

## Requirements

- Group rows by normalized Copilot account identity.
- Prefer `copilot:mask:<mask>` when a mask is unique.
- Use `copilot:mask:<mask>:label:<label>` when a mask is shared.
- Use `copilot:label:<label>` when no mask exists.
- Match existing accounts by exact mask first and exact normalized label for collisions.
- Return unresolved groups for preflight account mapping instead of guessing.
- Produce one deterministic new-account draft per unresolved group.
- Default new-account drafts to the Copilot label, mask, provider `copilot-money`, and depository type.

## Implementation Notes

- Keep the resolver pure under `packages/finance/src/import/`.
- `csv_import_key` must be stable across retries and independent of the database UUID.
- A renamed account with a stable unique mask should still resolve to the same account.

## Acceptance Criteria

- [ ] The sample-shaped fixture produces one group per Copilot account identity.
- [ ] Shared masks are disambiguated by exact label.
- [ ] Ambiguous groups are returned as unresolved and never auto-attached.
- [ ] The same source identity produces the same `csv_import_key` every time.

## Testing

- Add unit tests for unique masks, shared masks, missing masks, renamed labels, unresolved groups, and multi-account files.

