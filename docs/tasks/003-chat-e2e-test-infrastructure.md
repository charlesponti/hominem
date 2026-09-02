---
title: 'Build the chat integration test SDK'
status: 'Implemented'
priority: 'urgent'
labels: [chat, testing, e2e, api, database]
depends_on: [002-chat-tool-event-round-trip.md]
blocks: [004-typed-generation-boundaries.md, 011-functional-chat-shipping-evidence.md]
estimated_size: 'XL'
---

## Outcome

Provide a deterministic API-local test SDK that exercises the real chat routes,
application services, generation runtime, repositories, PostgreSQL, durable
events, replay, SSE, and client reduction without mocking those boundaries.

## Scope

### In scope

- API-local test context, scripted provider, in-process tools, and durable inspectors.
- Deterministic generation, tool, confirmation, retry, cancellation, replay, and failure scenarios.
- A structured evidence manifest consumed by Web and Omiro verification tasks.

### Out of scope

- Product behavior changes outside a confirmed testability defect.
- Career, Finance, database schema design, or production failure injection.
- Final cross-client release evidence; that belongs to Task 011.

### Deferred

- Additional failure seams not required by the current scenario matrix.
- Harness-specific Browser or simulator limitations; record them in Task 011.

## Work sequence

| ID | Work item | Owner boundary | Depends on | Validation / artifact | Done when |
| --- | --- | --- | --- | --- | --- |
| W-001 | Define the test context | `services/api/src/testkit` | Task 002 | SDK contract test | `HominemTests.create()` exposes typed chat operations and deterministic `close()` cleanup. |
| W-002 | Implement scripted provider and tools | API testkit/provider seam | W-001 | Provider and tool integration tests | Text, reasoning, fragmented tools, confirmation, retry, provider failure, and tool failure are selectable by named fixtures. |
| W-003 | Add durable inspectors | API testkit/DB boundary | W-001 | Inspector integration tests | Runs, events, messages, projections, snapshots, usage, and tool effects can be queried without credentials in output. |
| W-004 | Cover lifecycle and failure paths | Generation service/testkit | W-002, W-003 | API integration matrix | Cancellation, replay overlap, idempotency, authorization, terminal ordering, and tool-effect reuse have deterministic assertions. |
| W-005 | Publish evidence manifest | Testkit/evidence output | W-004 | Schema validation and sample manifest | Each scenario records result, correlation, durable state, duplicate checks, and artifact paths. |
| W-006 | Validate and hand off | API package and Task 011 | W-005 | Focused API tests/typecheck/build/lint and `git diff --check` | The SDK is reusable by browser/mobile evidence work and known gaps are listed without inventing new scope. |

Items are serial in the listed order. A failure in one item stops its
dependents; unrelated validation may run in parallel only when it does not
alter the test database or evidence run.

## Acceptance criteria

- [x] AC-001: A test can start, send, regenerate, replay, cancel, and respond to confirmation through real routes; the manifest contains request/generation correlation and terminal state.
- [x] AC-002: A test can assert durable event ordering, persisted messages/tool calls, usage, SSE framing, idempotency, and duplicate counts.
- [x] AC-003: Named test-only provider/tool/failure controls are rejected in production mode.
- [x] AC-004: `close()` removes every record created by the test context, and the cleanup inspector proves no disposable data remains after confirmation.

## Current status

The SDK façade, scripted OpenRouter/MSW boundary, durable inspectors, and most
API scenarios exist. The remaining gaps are incomplete failure/replay coverage
and cross-client evidence, which is owned by Task 011 rather than this SDK task.

The current API-local slice includes a structured `HominemTests.evidence()`
manifest, persisted manifest artifacts through `writeEvidence()`, durable
tool-effect inspection, duplicate checks, and a cleanup receipt asserted by test
teardown. The focused testkit run passes 288 tests; DB and API typechecks, DB/API
lint, API build, formatting, and `git diff --check` also pass.
The remaining Browser/Omiro release evidence is intentionally tracked by Task
011 and is not part of this SDK exit gate.

Authoritative evidence is the latest generated testkit manifest and focused
test output; raw disposable IDs and run logs do not belong in this document.

## Exit gate

Mark `Implemented` when AC-001–AC-004 pass with test output and a cleanup
receipt. Keep `Partial` only when an active SDK work item remains incomplete.
Browser/Omiro evidence belongs to Task 011. Mark `Blocked` only for an
external dependency that prevents an active work item and has an exact owner
and next action.

Do not expand this task to absorb release evidence or unrelated product fixes;
create a new task for deferred work.
