---
title: 'Implement deterministic generation crash recovery'
status: 'Implemented'
priority: 'urgent'
labels: [chat, recovery, database, reliability]
depends_on: [004-typed-generation-boundaries.md]
blocks: [006-generation-cursor-recovery.md, 008-generation-observability.md]
estimated_size: 'XL'
---

## Outcome

An interrupted generation can be resumed from a valid owner-scoped checkpoint
or terminalized exactly once, including provider, confirmation, persistence,
cancellation, replay, and tool-effect paths.

## Scope

In scope: recovery lookup, checkpoint validation, resume/terminal policy, and
idempotent tool effects. Out of scope: cursor transport implementation,
cross-client convergence, and unrelated runtime refactors.

## Work sequence

| ID | Work item | Owner boundary | Depends on | Validation / artifact | Done when |
| --- | --- | --- | --- | --- | --- |
| W-001 | Define recovery policy | generation service/machine | Task 004 | phase/state matrix | Each active phase has a resume or terminal outcome. |
| W-002 | Load and validate checkpoints | generation repository | W-001 | owner/cursor tests | Only valid owner-scoped checkpoints can resume. |
| W-003 | Resume or terminalize runs | service/interpreter | W-002 | failure-injection integration tests | First durable terminal decision wins. |
| W-004 | Reuse tool effects | effect ledger | W-003 | idempotency test | Recovery never invokes an already-applied effect twice. |

### W-001 recovery policy

| Durable phase | Recovery disposition | Allowed next action | Safety invariant |
| --- | --- | --- | --- |
| preparing | resume_required | Re-enter the generation with the persisted run identity | Do not create a second user message or generation run |
| queued | resume_required | Re-enter once the worker/route owns the run | Same generation ID and owner scope are retained |
| running | resume_required | Restore the latest valid checkpoint, then continue provider work | Replayed events at or before the cursor are not applied twice |
| saving | resume_required | Reconcile durable events/projection before attempting persistence again | A committed/cancelled/failed event wins over any later write |
| cancel_requested | resume_required | Complete cancellation reconciliation unless a terminal event already exists | Cancellation is neutral and terminalized at most once |
| awaiting_confirmation | awaiting_confirmation | Keep the confirmation action available; resume only after an owner decision | Never execute the pending tool effect during passive recovery |
| committed | terminal | Replay the committed history | No second assistant message or terminal event |
| cancelled | terminal | Replay the cancellation history | No provider/tool execution after cancellation |
| failed | terminal | Replay the failure history or use the explicit retry operation | Original failed run remains unchanged |

The matrix is intentionally owner-scoped: a recovery lookup for another user is
not a resumable state and must return the existing authorization/not-found
outcome without revealing the run.

## Acceptance criteria

- [x] AC-001: Provider, confirmation, snapshot, cancellation, append, replay, and fresh-launch interruptions are covered.
- [x] AC-002: Durable ordering, projection state, owner isolation, and first-terminal-wins are asserted.
- [x] AC-003: Resume versus deterministic terminalization is explicit for every active phase.

## Validation record

- The phase matrix above is the recovery policy for every persisted generation
  phase.
- Service, generation-machine, replay, DB, RPC, and API testkit coverage asserts
  owner-scoped recovery, checkpoint restoration, cancellation ordering, replay
  recovery, append/snapshot/publication failure handling, first-terminal-wins,
  and tool-effect reuse.
- `TURBO_FORCE=true pnpm run check` passed: declaration validation, lint, build,
  typecheck, and the full repository test matrix.

## Exit gate

Close with the phase matrix, integration output, and durable evidence for every
interruption. This task is now closed. An unresolved external test dependency
would be Blocked with an owner and next action; it is not silently skipped.
