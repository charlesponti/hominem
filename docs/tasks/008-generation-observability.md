---
title: 'Make generation recovery observable'
status: 'Implemented'
priority: 'medium'
labels: [chat, observability, tracing]
depends_on: [007-client-convergence.md]
blocks: [011-functional-chat-shipping-evidence.md]
estimated_size: 'M'
---

## Outcome

A redacted diagnostic record correlates generation attempts, durable events,
replay, recovery decisions, terminal outcomes, and tool-effect outcomes without
including user or provider payloads.

## Scope

In scope: telemetry fields, correlation, error categories, effect outcomes,
redaction, and tests. Out of scope: new product behavior and runtime
consolidation.

## Work sequence

| ID    | Work item                  | Owner boundary              | Depends on | Validation / artifact | Done when                                                                        |
| ----- | -------------------------- | --------------------------- | ---------- | --------------------- | -------------------------------------------------------------------------------- |
| W-001 | Define correlation record  | generation/replay telemetry | Task 007   | field contract        | Required IDs, cursor, mode, decision, outcome, and error category are named.     |
| W-002 | Emit lifecycle correlation | application operations      | W-001      | telemetry tests       | Send, replay, reconnect, recovery, deduplication, and terminalization correlate. |
| W-003 | Protect diagnostics        | telemetry/error boundary    | W-002      | redaction tests       | Content, chunks, arguments, and results never enter safe diagnostics.            |

## Acceptance criteria

- [x] AC-001: One record correlates generation ID, attempt/turn, durable sequence, replay cursor, delivery mode, recovery decision, terminal outcome, error category, and effect outcome.
- [x] AC-002: Redaction tests pass without weakening useful correlation.

## Validation record

- Added `GenerationDiagnosticRecord` and `recordGenerationDiagnostic` at the
  API telemetry boundary. It accepts only scalar correlation fields and builds
  the logged object explicitly, so provider content, chunks, tool arguments,
  and results cannot enter the diagnostic record through object spreading.
- Existing lifecycle emitters continue to record delivery, deduplication, tool
  effect, and recovery outcomes; the focused telemetry suite covers their safe
  fields and the complete diagnostic contract.
- Validation run: focused API telemetry tests passed, full uncached
  `TURBO_FORCE=true pnpm run check` passed (26/26 tasks), and `git diff --check`
  passed.

## Exit gate

Closed. The redacted diagnostic contract and focused API tests are present.
Runtime-consolidation work remains in Task 009 and is not expanded here.
