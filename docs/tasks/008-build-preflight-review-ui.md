---
title: "Build the Copilot preflight review UI"
status: "todo"
priority: "high"
labels: [finance, copilot, frontend, preflight]
depends_on: ["007-build-preflight-api.md"]
blocks: ["009-confirm-frozen-import-plan-api.md", "015-wire-frontend-job-state.md"]
estimated_size: "L"
---

## Objective

Let users review every account group and repeated-row candidate before confirming a Copilot import.

## Context

The file can contain multiple accounts. Unresolved groups need individual account choices, and repeated rows must remain selected by default.

## Requirements

- Upload one file into the preflight flow.
- Display every Copilot account group with its label, mask, row count, and resolution state.
- Allow each unresolved group to map to an existing account or create a new account.
- Show repeated-row candidates with individual selection controls.
- Keep all candidate rows selected by default.
- Preserve preflight state across refresh through the retrieval endpoint.
- Allow dismissing the preflight.
- Submit explicit account mappings and selected row identities for confirmation.

## Implementation Notes

- Do not create accounts or jobs from the UI directly.
- Use stable group and row identities, never filename identity.
- New-account UI should show the Copilot label and mask defaults.

## Acceptance Criteria

- [ ] Multi-account files show separate groups.
- [ ] Each unresolved group can independently choose an existing or new account.
- [ ] Repeated candidates are visible and selected by default.
- [ ] Deselecting one row does not deselect other rows.
- [ ] Refresh restores the same preflight state.
- [ ] Confirmation sends the complete mapping and selection payload.

## Testing

- Add frontend tests for group mapping, new-account selection, repeated-row selection, refresh hydration, dismissal, and confirmation validation.

