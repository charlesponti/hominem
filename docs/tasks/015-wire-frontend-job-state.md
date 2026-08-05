---
title: "Wire preflight and import job frontend state"
status: "done"
priority: "high"
labels: [finance, frontend, copilot, websocket]
depends_on: ["008-build-preflight-review-ui.md", "009-confirm-frozen-import-plan-api.md", "013-add-job-list-and-cancellation-api.md", "014-add-import-websocket-server.md"]
blocks: ["017-run-copilot-end-to-end-verification.md"]
estimated_size: "L"
---

## Objective

Connect the finance UI to preflight confirmation, job hydration, live progress, refresh recovery, and cancellation.

## Context

The existing store keys state by filename and the WebSocket client currently sends a query-string token. Job identity must be `jobId`.

## Requirements

- Remove query-string token generation from the WebSocket client.
- Key all import state, rendering, and removal actions by `jobId` or stable preflight/row identity.
- Hydrate jobs on mount from the jobs endpoint.
- Reconcile WebSocket snapshots and progress updates without replacing unrelated jobs.
- Show queued, processing, done, error, and cancelled states.
- Call cancellation for queued and active jobs.
- Keep completed-job removal as a local UI cleanup action.
- Render actual final stats and partial cancellation outcomes.

## Implementation Notes

- Do not use filename matching anywhere in import state reconciliation.
- Preserve stable local `File` objects for hydrated jobs without pretending the CSV content is available client-side.

## Acceptance Criteria

- [ ] Two files with the same filename remain independent.
- [ ] Refresh during preflight restores the review state.
- [ ] Refresh during execution restores the job and continues live updates.
- [ ] Cancellation changes the backend job state and UI state.
- [ ] WebSocket reconnect does not blank or regress progress.

## Testing

- Add frontend tests for preflight hydration, mapping submission, row selection, job reconciliation, duplicate filenames, reconnect, and cancellation.

