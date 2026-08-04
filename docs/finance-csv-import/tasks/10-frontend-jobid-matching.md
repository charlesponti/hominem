---
title: "Phase 2: frontend switch matching from fileName to jobId"
order: 10
phase: app-wiring
status: ready
depends_on: []
blocked_by_decisions: []
area: frontend
---

# Frontend preflight review and job tracking

## Summary

The frontend must show the Copilot preflight before queueing work, keep row selection and account mappings explicit, and match live job updates by `jobId`.

## Work

1. Key local `statuses`/`FileStatus` state by `jobId` instead of `fileName` in `use-import-transactions-store.ts`.
2. Update `import.tsx`'s rendering (`allFiles`, dedup/sort logic) to use `jobId` for identity.
3. Update `removeFileStatus` (and task `11`'s cancellation) to take a `jobId`.
4. Remove the `deduplicateThreshold` field from the upload request and any related UI control, since task `05`'s route no longer accepts it.
5. Add per-group existing-account/new-account mapping controls and a repeated-row review with all candidates selected by default.

## Notes

Mostly mechanical, low risk, no open decisions — could be done early/in parallel with backend tasks since it only touches frontend state-keying and request shape, not anything requiring the backend to exist yet.
