---
title: "Phase 2: manual end-to-end verification"
order: 13
phase: app-wiring
status: blocked
depends_on: ["09-frontend-hydration", "10-frontend-jobid-matching", "11-cancellation", "12-integration-tests"]
blocked_by_decisions: []
area: fullstack
---

# Manual end-to-end verification

## Checklist

- [ ] Upload a real (anonymized) bank CSV through the UI; confirm live progress updates render smoothly through completion.
- [ ] Refresh the import page mid-import; confirm progress state is still visible (not blank) via hydration (task `09`), and continues updating live once the WS reconnects.
- [ ] Re-upload the same file; confirm all rows report as skipped and no duplicate transactions appear in the account.
- [ ] Re-upload a second file from the same institution/account; confirm it lands on the **same** account rather than creating a duplicate one.
- [ ] Upload a single CSV containing rows for two different accounts (if a multi-account fixture is available); confirm both resolve correctly.
- [ ] Upload a deliberately malformed/non-CSV file; confirm a clear top-level error, not a job stuck at `invalid: N` with a huge error dump.
- [ ] Start an import, then cancel it (task `11`) while queued, and again while in-progress; confirm both behave as designed.
- [ ] Upload two files with the same filename in the same session; confirm they're tracked independently (task `10`).
- [ ] Confirm imported transaction amounts/signs match expectations relative to any existing Plaid-synced transactions on the same account.
- [ ] If multiple `services/api` replicas are actually running in the target environment, confirm live progress still reaches the browser regardless of which replica issued the WS connection vs. which replica's worker processed the job.
