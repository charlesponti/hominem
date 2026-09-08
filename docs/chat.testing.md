# Chat testing and evidence

This document defines the repeatable test contract for chat. It replaces the
historical implementation task records with the stable behavior and evidence
that future work must preserve.

## Decision

Chat lifecycle behavior spans API services, persistence, event publication,
replay, Web, and Omiro. Use an API-local test SDK with named scripted-provider,
in-process-tool, timing, failure, durable-inspection, evidence, and cleanup
controls. The SDK exercises real application and transport boundaries and
replaces only external provider and tool effects. These API-local controls are
for chat API/application behavior and durable lifecycle races; they are not a
substitute for the client/MSW boundary defined by [`docs/testing.md`](testing.md).
Controls are available only in the test environment; production rejects them.

The evidence manifest is authoritative for scenario results. A result is
`Implemented` only when visible client evidence, corresponding durable/API
evidence, required artifacts, and duplicate checks are present. Unsupported
states are recorded as `Blocked` with their exact dependency.

## Test boundary

API-local tests use the real chat routes, application services, generation
runtime, repositories, PostgreSQL, durable event publication, replay, SSE, and
client reduction. The test SDK may replace only external provider and tool
effects with named deterministic fixtures. Failure and timing seams may
control an API-owned race only when the API/application behavior is under test;
they must not replace the API boundary for a client behavior test. It must
never mock the chat boundaries under test.

The test context provides typed chat operations, a scripted OpenRouter/MSW
provider, in-process tools, durable inspectors, evidence output, and
deterministic cleanup. Named provider/failure controls are test-only and are
rejected in production mode.

## Required fixture coverage

Fixtures cover normal text and reasoning, fragmented and multiple tool calls,
confirmation approval and rejection, safe retry, provider failure, tool
failure, cancellation timing, reconnect, replay overlap, publication and
persistence failures, authorization isolation, repeated generation IDs, and
fresh-launch recovery.

Each API-local fixture must assert the applicable visible semantic state and
durable state: event ordering, generation/request correlation, terminal
exclusivity, persisted messages and tool calls, usage availability, idempotency,
SSE framing, cursor behavior, duplicate counts, and tool-effect reuse. Client
component and transport fixtures assert the client-visible state and wire
contract at their own boundary; they do not require a database or durable
inspector unless that boundary is explicitly under test.

## Evidence manifest

The generated manifest is authoritative for a run. Each scenario record
contains environment metadata, action and visible transitions, recovery and
terminal state, generation/request IDs and durable sequence/cursor, persisted
state summaries, duplicate and authorization checks, screenshot/DOM or
simulator artifacts, redacted logs, and a cleanup receipt.

Disposable IDs, timestamps, screenshots, logs, and database records belong in
generated artifacts, not durable architecture documentation. Credentials,
cookies, authorization headers, provider arguments, tool arguments, content
payloads, and results must be redacted.

## Client verification

Web and Apple-only Omiro consume the same canonical event fixtures and must
reduce equivalent histories to equivalent semantic state. Web Fetch/SSE and
Omiro XHR/SSE transport tests cover fragmented frames, disconnect/reconnect,
replay overlap, terminal replay, invalid cursors, and checkpoint restoration.

Product evidence is separate from API-local correctness. Playwright and
Maestro artifacts are required for their respective acceptance surfaces; API
correctness alone is not a passing cross-client result.

## Boundary lessons

Deterministic dependency failures are injected at the boundary that owns the
state under test. Client loading, error, and retry states use Vitest with MSW
against the real component or hook. SSR loading and error preservation use
Node MSW against the real loader. Playwright may provide optional browser
smoke coverage, but server-rendered data failures must not be forced through
browser request interception or a new proxy solely to manufacture a failure.

Retry evidence must assert both recovery and cleanup: a temporary assistant
message is removed when retry settles, and the committed response is reloaded
without a duplicate streaming message. Web scenarios that exercise a
stateful API failure must use a fresh isolated chat when prior durable history
could obscure the state being asserted.

Omiro tool-confirmation scenarios use isolated fresh chats and visual evidence
for the pending, approved or rejected, and terminal states. A deterministic
provider fixture must emit the confirmation request first and emit the
post-decision response only after the tool result, so the evidence proves the
real approval boundary rather than a pre-scripted terminal message.

## Cleanup and validation

Every chat test context that creates durable records owns those records and
exposes `close()` cleanup. Isolated client/MSW tests do not require durable
records. Cleanup is exact and inspectable. Evidence is preserved before
deletion, and destructive cleanup requires action-time confirmation for manual
or browser verification.

The standard gate is focused package suites plus typecheck, lint, build,
formatting, `pnpm run check`, and `git diff --check`. Unsupported states are
recorded as Blocked with the exact missing capability rather than simulated.

Provider failure, tool failure, confirmation, retry, cancellation, replay,
reload, authorization isolation, and persistence races can be reproduced
without changing production behavior. Playwright is the repeatable Web
evidence harness and Maestro is the repeatable Apple-only Omiro harness.
Neither harness starts or stops services during a scenario run.
