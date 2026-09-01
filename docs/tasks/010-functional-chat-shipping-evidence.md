---
title: "Complete functional chat shipping evidence"
status: "todo"
priority: "high"
labels: [chat, e2e, browser, ios, evidence]
depends_on: [007-generation-observability.md, 009-remove-generation-compatibility.md]
blocks: []
estimated_size: "L"
---

## Objective

Record the final automated, browser, and Apple-only iOS evidence against the
functional-chat release gate and link each result to the capability it proves.

## Context

The final gate depends on the recovery, convergence, observability, and legacy
removal tasks. Evidence must prove behavior in the environment where it
matters. Services must already be running for interactive flows; this task must
not start them. User-facing capability claims change only when their
corresponding evidence exists.

## Requirements

- Run the scoped tests from tasks 001–009 and record the exact commands/results.
- Run browser flows for send, confirmation, cancellation, failure/retry,
  regeneration, forced reconnect, terminal replay, and fresh launch; capture
  the observed phase, message/tool state, cursor, and terminal result.
- Run the same scenario matrix in the Apple-only iOS simulator using Maestro
  or the established Omiro flow runner.
- Record environment, app/service revision, database state, artifacts, and
  unverified conditions in the Hominem evidence format.
- Update `docs/chat.capabilities.md` only when a recorded flow proves the
  corresponding capability; do not rewrite unrelated claims.

## Implementation Notes

- Follow `docs/evidence.md` and the `hominem-evidence` skill.
- Use the existing browser and Omiro runbooks for setup; do not start services
  implicitly.
- Do not claim interactive coverage from unit or route tests.

## Acceptance Criteria

- [ ] Each named lifecycle flow has a browser artifact and observed-state record.
- [ ] Each named lifecycle flow has an iOS simulator artifact and observed-state record.
- [ ] Scoped API, replay, and end-to-end tests pass with commands recorded.
- [ ] The evidence record identifies every remaining unverified behavior.
- [ ] The release record links recovery, convergence, observability, and legacy
  removal evidence without claiming unsupported capability completion.

## Testing

- Scoped API/package tests and the full uncached validation gate.
- Browser interaction and visual inspection for every listed state.
- iOS simulator/Maestro interaction and visual inspection for every listed state.
- Evidence record review against `docs/evidence.md`.
