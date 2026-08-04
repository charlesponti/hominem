---
title: "Verify the Copilot import end to end"
status: "todo"
priority: "high"
labels: [finance, copilot, manual-verification]
depends_on: ["011-materialize-copilot-metadata.md", "012-build-import-worker.md", "013-add-job-list-and-cancellation-api.md", "014-add-import-websocket-server.md", "015-wire-frontend-job-state.md", "016-add-import-integration-tests.md"]
blocks: []
estimated_size: "L"
---

## Objective

Verify the complete Copilot Money import experience against a local sanitized fixture and the actual running finance app.

## Context

The feature has multiple user-visible states: preflight, mapping, duplicate review, confirmation, progress, refresh, retry, cancellation, and completion.

## Requirements

- Use the sanitized fixture, never commit or upload the raw financial export.
- Verify all account groups appear and map independently.
- Verify existing-account mapping and new-account creation.
- Verify repeated-row candidates are selected by default and individually deselectable.
- Verify normalized regular, income, transfer, pending, and excluded behavior.
- Verify tags, notes, provider payload, and recurring preservation.
- Verify refresh during preflight and active execution.
- Verify live WebSocket progress and reconnect snapshots.
- Verify cancellation while queued and while processing.
- Re-import the same fixture and verify zero duplicate transactions.

## Implementation Notes

- Record exact observed counts and terminal job stats.
- Treat any skipped, stale-build, unauthenticated, or ambiguous result as a blocker.
- Do not call the feature complete based on typecheck or unit tests alone.

## Acceptance Criteria

- [ ] Every manual scenario completes with observable expected state.
- [ ] No duplicate account or transaction appears after re-import.
- [ ] Excluded rows are absent from analytics totals but present in transaction data.
- [ ] Cancellation leaves partial rows only when processing had already begun.
- [ ] The final job state and UI state agree after refresh and reconnect.

## Testing

- Run the documented manual verification checklist against the local finance app and attach the observed results to the task review.
