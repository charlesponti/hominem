---
title: "Build the Copilot preflight API"
status: "done"
priority: "high"
labels: [finance, copilot, api, preflight]
depends_on: ["004-implement-account-group-resolution.md", "005-implement-row-identity-and-plan.md", "006-add-import-state-and-queue-contract.md"]
blocks: ["008-build-preflight-review-ui.md", "009-confirm-frozen-import-plan-api.md"]
estimated_size: "L"
---

## Objective

Expose authenticated preflight, retrieval, and dismissal endpoints for one Copilot CSV.

## Context

The user must review account mappings and repeated-row candidates before any background job starts.

## Requirements

- Add `POST /api/finance/import/preflight` for one multipart CSV.
- Enforce a bounded upload size suitable for the supported 30,000-row export.
- Validate the Copilot header contract before storing the preflight.
- Parse, group, resolve, and plan the file using pure engine modules.
- Return `preflightId`, expiry, account groups, unresolved mappings, repeated-row candidates, and stats.
- Add `GET /api/finance/import/preflight/:preflightId`.
- Add `DELETE /api/finance/import/preflight/:preflightId`.
- Use existing authenticated finance route conventions.

## Implementation Notes

- Keep raw CSV and proposed plan in Redis through task 006 helpers.
- Do not enqueue BullMQ work during preflight.
- Return clear top-level parse failures separately from row-level failures.

## Acceptance Criteria

- [ ] A valid Copilot CSV creates exactly one owner-scoped preflight.
- [ ] A non-Copilot CSV is rejected before persistence.
- [ ] Retrieval after refresh returns the same groups and candidate rows.
- [ ] Dismissal removes the preflight and raw content.
- [ ] Unauthenticated and cross-user access are rejected.

## Testing

- Add API integration tests for valid upload, malformed upload, size limit, retrieval, dismissal, expiry, and ownership isolation.
