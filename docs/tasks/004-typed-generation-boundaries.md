---
title: 'Typed generation boundaries'
status: 'Partial'
priority: 'high'
labels: [chat, validation, api, ci]
depends_on: [003-chat-e2e-test-infrastructure.md]
blocks: [005-generation-crash-recovery.md, 011-functional-chat-shipping-evidence.md]
estimated_size: 'L'
---

## Outcome so far

Malformed tool arguments become safe failed tool results without invoking MCP.
Provider chunks, canonical events, SSE records, and persisted generation JSON
have typed parsing paths. Invalid durable values raise payload-free
`ValidationError`s instead of becoming `null`; unsafe sequences are rejected.

## Remaining change

Boundary: provider/API/database/SSE ingress.

Audit remaining generic JSON parsing and callback error paths in provider,
snapshot, request-context, and SSE code. Replace shared chat payload parsing
with discriminated success/error results or boundary-specific typed errors.
Define whether malformed input is rejected, terminalized, or closes transport
at each boundary. Add tests for callback exceptions and cursor
non-advancement, and make uncached declaration validation explicit in CI.

## Exit gate

Task 004 is complete only when the audit names every remaining generic parse and
each has an owner, error category, and malformed-input behavior; focused tests
cover provider, tool, snapshot, event, SSE, persistence, live-publication, and
cursor behavior; safe errors and telemetry contain no sensitive payloads; and
`TURBO_FORCE=true pnpm run check` passes. The declaration/live-type checks
must also be recorded, including any known stale-boundary result.

Task 005 must not start until this gate is recorded in the task evidence.
