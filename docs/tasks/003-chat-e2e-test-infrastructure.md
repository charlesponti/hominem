---
title: 'Build the chat integration test SDK'
status: 'Partial'
priority: 'urgent'
labels: [chat, testing, e2e, api, database, web, omiro]
depends_on: [002-chat-tool-event-round-trip.md]
blocks:
  [
    004-typed-generation-boundaries.md,
    005-generation-crash-recovery.md,
    006-generation-cursor-recovery.md,
    007-client-convergence.md,
    008-generation-observability.md,
    009-generation-runtime-consolidation.md,
    010-remove-generation-compatibility.md,
    011-functional-chat-shipping-evidence.md,
  ]
estimated_size: 'XL'
---

## Objective

Build one deterministic, API-local SDK for testing the complete Hominem chat
path. It must exercise real Hono routes, application services, generation
runtime, repositories, PostgreSQL, durable events, replay, SSE, and canonical
client reduction. Only provider behavior and external infrastructure that
cannot run in-process may be controlled.

## Current status

`Partial`. The first SDK façade exists at
`services/api/src/testkit/hominem-tests.ts`. It creates an authenticated test
user, mounts real generation routes with a real `ChatGenerationService`, injects
a scripted model/planner/tool runtime, parses canonical SSE, reduces events to
client state, and provides durable database inspection. The route factory and
service dependency seams preserve production defaults.

The façade currently proves start text, optional usage persistence, fragmented and
multiple tool execution, send, terminal replay, duplicate-safe reduction,
transient retry, permanent provider failure, confirmation approval/resume and
rejection, tool failure continuation, regeneration, and four named failure
seams. The rejection scenario also established the required lifecycle rule: a
rejected tool may produce a `tool.failed` semantic result, but it must not be
persisted as an execution failure. The complete operation/scenario matrix,
browser evidence, and iOS simulator evidence remain open. The repeatable
browser procedure is documented in
[`../chat-browser-playbook.md`](../chat-browser-playbook.md). The former
module-mocked generation E2E file has been removed; the SDK is now the
API-local integration entry point.

The Web blocker work has also landed on the current branch. The local scripted
provider uses MSW at the OpenRouter SDK boundary, returns deterministic streamed
tool calls and post-tool completions, and is rejected in production mode. Web
confirmation state now survives the stream boundary, pending tool calls render
approval controls, rejected confirmations do not become persisted execution
failures, and resumed confirmation replaces the awaiting message instead of
creating a duplicate assistant message. Omiro clears restored terminal
generations and invalidates the chat query after replay. Legacy generation and
tool-call records are covered by applied database backfill/repair migrations.

## SDK contract

The public test entry point is `HominemTests.create({ provider })` and returns a
disposable test context. The context must provide:

- `chat.start`, `chat.send`, `chat.regenerate`,
  `chat.respondToConfirmation`, `chat.replay`, and `chat.cancel`.
- Typed scripted provider turns for text, reasoning, fragmented/multiple tool
  calls, usage, retry, permanent failure, and cancellation timing.
- Typed in-process tools with input/output schemas, confirmation metadata, and
  observable idempotency keys.
- Parsed SSE results containing response metadata, canonical events, durable
  versus live events, durable sequence IDs, `[DONE]` count, and reduced client
  state.
- Inspectors for runs, events, projections, snapshots, messages, usage, and
  tool effects.
- Named failure injection at provider, tool, append, snapshot, cancellation,
  replay/publication, queue, and transport-disconnect seams. The current SDK
  implements append, snapshot, publication, and cancellation commit injection;
  provider and tool failures are scripted through their real boundaries.
- Deterministic `close()` cleanup for every created user and chat record.

The SDK must not mock repositories, application services, the generation
machine/interpreter, event persistence, replay, or SSE framing in integration
tests.

## Required scenarios

Implement SDK-backed route-to-state tests for:

- Start and send with text, reasoning, usage, and committed projections.
- Fragmented and multiple tool calls through the real tool boundary.
- Successful tools, confirmation approval, confirmation rejection, and tool
  failure.
- Provider retry, permanent provider failure, and repeated generation IDs.
- Cancellation before execution and during persistence.
- Replay overlap, terminal replay, fresh reducer reconstruction, and request
  disconnect.
- Regeneration, authorization/owner isolation, idempotency reuse, and usage
  aggregation.
- Equivalent Web and Omiro reducer state from the same canonical events.

Every scenario must assert the relevant durable ordering, terminal behavior,
projection/message/tool records, SSE framing, and final client state.

## Implementation boundary

The API route factory accepts an injected `ChatGenerationService`; the default
export continues to use the production singleton. The service accepts optional
provider/model, planner, tool-runtime, and narrow external-infrastructure
adapters, all defaulting to production implementations. These seams are for
composition and testing only and must not move domain behavior into the route.

External queue, storage, Redis, and telemetry replacements must be narrow,
explicit, observable, and isolated from repository/application behavior.

The chat repository keeps `lastMessageAt` monotonic using a database-side
`GREATEST` update. This makes the timestamp invariant deterministic when the
application and database clocks differ; the testkit relies on that invariant
when creating and appending messages.

## Evidence ledger

Implemented evidence currently includes:

- `services/api/src/testkit/hominem-tests.test.ts`: 16 passing SDK scenarios
  covering start, send, reasoning/usage, missing usage, fragmented tools, tool failure,
  multiple tools, confirmation approval/rejection, retry, permanent provider
  failure, regeneration, terminal replay, duplicate-safe reduction, owner
  isolation, and named append/snapshot/publication/cancellation failure seams.
- `pnpm --filter @hominem/db test`: 27 passing tests.
- `pnpm --filter @hominem/api test`: 265 passing tests after removing the
  module-mocked generation E2E.
- `pnpm --filter @hominem/api typecheck`, API build/lint, and `pnpm run check`:
  passing; lint reports existing warnings but no errors.
- Web and Omiro focused reducer/transport tests pass as part of `pnpm run
check`; these are app-local fixtures, not yet SDK-backed route flows.
- Web validation: 179 tests passed and Web typecheck passed.
- Omiro validation: 480 tests passed and Omiro typecheck passed.
- API validation: 270 tests passed; database migrations and codegen completed.
- `git diff --check` passed. React Doctor completed with existing project
  warnings only; no new warning was attributed to this change set.
- PR 300 review follow-up: all seven inline review threads were replied to and
  resolved; current CI checks are green. No commit was created by this task.
- Browser playbook runs: B-001 direct-load/reload passed with no browser
  warnings or errors; B-002 send/stream/reload passed with a completed
  tool-backed response and no browser warnings or errors. B-002 intentionally
  created the disposable `Browser Playbook B-002 Test` collection through the
  real tool boundary; its cleanup is still outstanding.

Open evidence remains explicitly unverified: cancellation before execution,
cancellation during persistence, request disconnect, replay subscription
failure, queue submission failure, fresh-launch recovery, SDK-backed Web/Omiro
convergence, most browser flows, and iOS simulator flows. The Web server is not
listening and all available iOS simulators are shut down in the current
environment, so those flows require user-started services and a booted
simulator before this task can pass its exit gate.

### Web browser verification — 2026-09-01

Environment: revision `06717d926`; Codex In-app Browser; Web
`http://localhost:4445`; API `http://localhost:4040`; authenticated disposable
test user; default Browser viewport (the explicit `320x568` override was not
honored by the Browser backend). Disposable chat IDs:
`01a03442-bce8-743f-a412-c22cffdeea42` and
`01a05eb5-096e-7548-bb0a-2fe3312b7297`.

- B-001: Implemented — direct reload restored persisted seed and assistant
  history; composer present; no Browser warnings or errors.
- B-002: Implemented — normal send rendered once, streamed `B002-READY`, and
  survived reload; no Browser warnings or errors.
- B-003: Implemented — conversation-actions → New chat created
  `01a05eb5-096e-7548-bb0a-2fe3312b7297`, persisted the first response, and
  listed the chat.
- B-004: Implemented on a clean tab — `/chats` → detail → back → detail
  restored the same history with no warnings or errors. An earlier stale-tab
  attempt recorded a transient Vite dynamic-import error and recovered after
  reload.
- B-005: Partial/Blocked — regeneration produced no new visible generation or
  error after approximately 23 seconds. The Web hook is wired and focused
  unit-tested; the live runtime did not expose a Web-fix signal.
- B-006: Implemented — `list_collections` transitioned to a completed tool
  card and the assistant response ended with `TOOL-B006-READY`.
- B-007: Partial/Blocked — the live flow created the disposable collection
  without exposing confirmation controls, despite the tool being marked
  confirmation-required in the API source. No additional disposable writes
  were attempted.
- B-008–B-015: Blocked — confirmation/failure-injection/disconnect states were
  not available through the running Web environment without changing the API
  or relying on arbitrary provider behavior.
- B-016: Implemented — a fresh Browser tab reconstructed the disposable chat,
  tool-backed response, and composer without warnings or errors.
- B-017: Open — active-generation reload/replay was not run after the live
  regeneration blocker.
- B-018: Implemented — an unowned UUID showed “Conversation unavailable” and
  leaked no private messages or tool data.
- B-019: Partial — unowned send was denied without rendering or persisting a
  message; the other requested operations had no actionable controls in the
  denied state.
- B-022: Partial — editing a user message persisted across reload. Delete was
  not executed because it requires action-time confirmation before removing
  disposable data.
- B-020–B-021: Open/Blocked — slow/empty loading and forced load/generation
  error states were not independently produced in the running environment.
- B-023: Partial — copy/listen controls rendered; share and a successful
  regeneration outcome were not verified.
- B-024: Blocked — the Browser viewport override remained `1280x720`, so the
  smallest-viewport assertion could not be verified.
- B-025: Partial — composer and submit controls were named and present; one
  unlabeled input remained in the interactive DOM inventory.

Artifacts are the Browser DOM snapshots and console-log captures from the
recorded run. API durable cursor/generation correlation was not available from
the Browser surface for this run and remains unverified.

### Blocker fixes — 2026-09-01

- Web now preserves `awaiting_confirmation` as an explicit stream status,
  prevents the transient composer message from being treated as an ordinary
  streaming response, and marks its pending tool call so approval controls can
  render. Approval and rejection controls also have explicit accessible names.
- The `create_collection` capability is now marked confirmation-required so the
  real tool boundary checkpoints the write before execution.
- Focused Web coverage passes for the confirmation phase and accessible tool
  actions. The API watcher did restart its child process, but the live Browser
  rerun still executed the test write immediately. The loaded capability
  definition and live request path remain uncorrelated. The focused API
  registration test now confirms the real `create_collection` definition is
  confirmation-required; a fresh Browser session currently has no open tabs,
  so the live B-007 rerun remains unverified.
- Follow-up Browser rerun: the pending `create_collection` card rendered with
  `Approve` and `Reject`, proving the Web confirmation state is now reachable.
  Approval reached the API but the resumed generation failed with
  `internal_error: Provider returned error`; no completion was observed in the
  Web UI. B-007 is therefore `Partial` until the running environment exposes a
  supported provider-success seam or valid provider configuration. The ordered
  matrix remains stopped at B-007.
- Added an opt-in local scripted OpenRouter mode backed by MSW. It intercepts
  the real SDK HTTP request, returns deterministic streamed tool calls and
  post-tool completions, and is rejected in production. The mode is documented
  in `services/api/README.md`; its SDK-boundary tests pass.
- Live Browser verification with `HOMINEM_AI_PROVIDER=scripted`: approval now
  reaches a completed `create_collection` tool state and a successful provider
  completion. The resumed completion currently appears as an additional
  assistant message while the original awaiting-confirmation message is also
  marked completed, so the no-duplicate assertion remains an open Web/API
  blocker. Historical Browser console entries still include hydration warnings
  and earlier network errors; a clean post-restart console capture is still
  required.
- Fixed the resume duplication path by clearing checkpoint prompt text and
  replacing the original confirmation message on approval/rejection. The
  durable testkit now asserts one assistant message containing only the resumed
  reply. A fresh Browser rerun was not completed because the local Vite route
  manifest intermittently returned `Failed to fetch` while navigating to a new
  chat.

### Review follow-up — 2026-09-01

The seven PR comments were addressed and resolved:

- Removed the unused Omiro `renderHook` import.
- Corrected Web tool status mapping so pending/running executions are not shown
  as completed, with regression coverage.
- Renamed the schema test to match the behavior it verifies.
- Added legacy generation snapshot and terminal metadata backfills.
- Confirmed the existing tool lifecycle repair handles legacy tool-call status.
- Kept rejected confirmations out of execution-failure state.
- Cleared restored Omiro generations after terminal replay and invalidated the
  affected chat query.

### Remaining work

Task 003 remains `Partial` because implementation and automated coverage are
ahead of the required end-to-end evidence. The next pass must:

- Rerun B-005 and B-007 in a clean Browser session with the scripted provider,
  proving regeneration and confirmation resume without duplicate visible or
  durable messages.
- Run and record B-014–B-015, B-017, B-020–B-021, and B-024, or record the exact
  harness dependency when a state cannot be produced.
- Finish the partial assertions for B-019, B-022, B-023, and B-025.
- Capture clean DOM/screenshot, Browser console, API correlation, durable
  cursor/sequence, terminal-state, and duplicate-check evidence for each
  runnable scenario.
- Complete SDK-backed Web/Omiro convergence, cancellation, disconnect,
  replay-overlap, queue, and cleanup evidence, plus iOS simulator flows when a
  user-started simulator is available.
- Preserve the evidence record, obtain action-time confirmation, then delete
  and verify all disposable users, chats, messages, runs, events, snapshots,
  and tool effects.

Do not advance to Task 004 until the exit gate below has passing artifacts.

### Live Browser continuation — 2026-09-02

The Web service was restarted and the Browser was connected through a fresh
tab. B-001 passed on disposable chat
`01a06087-8888-7887-a939-422e62b584a9` with the expected empty initial state.
B-002 passed on that chat after sending one message: the scripted response
rendered once and remained single after reload. B-003 and B-004 passed on
`01a06088-fae6-7a7a-9869-980cfb84ab63`; the new chat persisted its first
response and survived list/detail/back/detail navigation. B-005 regenerated
the assistant response on that chat; the API recorded one committed
regeneration run and the chat still contained one assistant projection.

B-006 initially exposed an over-broad scripted-provider matcher that selected
`create_collection` for a list request. The matcher now prioritizes list/show
intent, returns `list_collections`, and returns the `TOOL-B006-READY`
continuation. The focused scripted OpenRouter tests pass (4 tests), and the
Browser rerun passed on `01a0608b-e6db-726e-94cd-d721cc6cc26c` with a visible
pending → completed `list_collections` card.

B-007 passed on `01a0608c-3369-7282-b7f8-d09d0f15a731`: confirmation controls
were visible, approval completed the `create_collection` call, and the
durable chat contained one user and one assistant message with a committed
run. B-008 exposed the corresponding stale-provider issue: the Browser still
received the old repeated-tool behavior after the provider rejection branch
was added. The API process must be restarted before B-008 is rerun; no further
ordered scenarios will be treated as started until that rerun passes.

The old chat `01a05efe-1d3a-7117-9c09-e435721ad066` contains three separate
historical send runs, which explains its repeated user/assistant blocks. It is
not evidence of duplicate messages within one current generation. Its data,
along with the new disposable chats above, remains pending cleanup confirmation.

### Live Browser continuation — 2026-09-02 (after API restart)

B-008 was rerun on `01a060a0-cecb-797f-b4fb-ec707fe14263` after the API was
restarted with `HOMINEM_AI_PROVIDER=scripted` and the Web app was reloaded.
The first rerun exposed a real Web/API seam defect: rejection was recorded, but
the resumed provider transcript did not contain a rejected tool result, so the
provider reopened the same confirmation. A focused service regression was added
in `services/api/src/application/chat-generation.service.test.ts`; the minimal
fix adds one rejected tool result to the resumed transcript without executing
the tool.

The scripted provider then needed a matching deterministic response rule. A
focused provider regression was added in
`services/api/src/testkit/openrouter.mock.test.ts`; the provider now returns
`The tool request was rejected.` when it receives the rejected result. The
focused service/provider suite passes (11 tests).

B-008 passed on fresh chat `01a060a0-cecb-797f-b4fb-ec707fe14263`: the Browser
showed one `Denied create_collection` card, the rejection text, no approval
controls, and no execution-success state. The API database showed one
`committed` send run, two messages (one user and one assistant), a rejected
`create_collection` tool call with no execution status, and ordered durable
events ending in `generation.committed` (sequence 14). No tool effect or
collection was created.

B-009 was then unblocked with a test-only scripted-provider trigger: the exact
`TOOL-B009-FAIL` phrase emits malformed arguments for the read-only
`list_collections` call, exercising the real tool-parser failure path. The
focused provider suite passes (7 tests). On fresh chat
`01a060a5-6a23-7f89-b515-0220e11faa35`, the Browser showed `Error
list_collections`, `The tool request failed.`, and a usable regenerate control.
The database showed one committed run (`a144dad4-6e3d-4db8-814d-43f4c72e4935`),
one failed tool call, one user message, one assistant message, and ordered
events `generation.started`, `generation.accepted`, `generation.phase_changed`,
`generation.phase_changed`, `tool.requested`, `tool.failed`,
`generation.phase_changed`, `generation.phase_changed`,
`generation.committed`. No duplicate message or tool effect was present.

B-010 now has a test-only MSW fixture keyed by `PROVIDER-B010-FAIL`: it returns
one HTTP 400 provider failure, while subsequent requests containing the same
marker return the normal scripted response. This avoids the OpenRouter SDK's
transparent 5xx retry and keeps the retry identity stable when prior history
is included. The focused fixture, API route/service, and Web hook tests pass.

The live Browser run reached the failure state while the API remained healthy;
the API log showed successful auth/chat requests and the scripted provider
failure, not a process crash. Web now reconstructs the failure after reload as
“I couldn’t finish that response. Please try again.” with Retry and dismiss.
Retry uses a dedicated generation attempt, reuses the original user message,
and the Browser rerun produced one successful scripted assistant response with
one visible user message.

The clean Browser rerun used chat `01a060d8-fb1b-7df0-8e09-a6f955f7905b`.
The DOM evidence captured the failure alert, Retry and dismiss controls, the
preserved composer draft, and after Retry a single user message followed by
`Scripted response: Provider failure B010 PROVIDER-B010-FAIL-UX`. Visual
inspection was completed in the Codex In-app Browser; no unexpected Browser
console error was observed during the successful rerun.

B-010: Implemented. The dev database contains failed run
`b3ebb7a0-8fcb-4380-8a8c-9a9a38286776` and committed retry run
`5941ad93-cac4-4b80-8821-1c74f450c302`; both reference user message
`01a060d9-0ec2-7677-ae52-4a870dcbe982`. The retry event sequence is
`generation.started` (sequence 1, linked to the failed generation),
`generation.accepted` (2), four phase changes (3–6), and
`generation.committed` (7). The original run ends with
`generation.failed` at sequence 5. A database count confirms exactly one user
message and one assistant message. Repeating the same retry request was
idempotent and did not create another provider call or message.

The API-local SDK now exposes the same dedicated retry operation used by Web.
Its integration coverage passes with 17 scenarios and verifies that the failed
run remains failed, the retry gets a new generation ID linked through
`retryOfGenerationId`, the original user message ID is reused, a repeated
retry request replays the committed result without another provider call, and
the chat contains exactly one user and one assistant message. Browser-side
durable inspection for the live B-010 chat is recorded above.

Browser timing controls are now available in the local scripted provider:
`B011-CANCEL-BEFORE` delays provider response, while `B012-STREAM`,
`B013-DISCONNECT`, `B014-REPLAY`, and `B017-ACTIVE-RELOAD` emit streamed frames
with deterministic gaps. They are test-environment-only and are documented
in `services/api/README.md`; B-011 through B-013 now have Browser evidence
below.

B-011 was then run against fresh disposable chat
`01a06123-2b1a-74a0-b057-02ae0ed348e7`. The exact
`B011-CANCEL-BEFORE` marker was submitted and Stop was clicked before the
scripted provider response. The Browser showed the neutral `Stopped.` state,
kept the original composer text, and rendered no assistant success. A clean
full-page screenshot and DOM snapshot were captured; the Browser console had
no warnings or errors. Durable inspection showed one cancelled send run
(`f889959d-35a1-44d2-b58b-da49da172507`), one user message, no assistant
message, and ordered events `generation.started`, `generation.accepted`, two
phase changes, `generation.cancel_requested`, and `generation.cancelled`.

This run exposed a race where late provider output could continue into the
saving path after cancellation had already committed. A focused service
regression now checks the run status immediately after generation execution;
cancelled runs return before snapshot or committed-event persistence. The
focused service test passes, and the Web typecheck passed after refreshing the
API declaration output. B-011: Implemented.

B-012 was run against fresh disposable chat
`01a06124-70b6-76f3-b1a6-06b9547e1e35` with the `B012-STREAM` marker. Submit
and Stop were issued in one Browser operation while the scripted provider was
streaming. The UI ended in neutral `Stopped.` state, retained the single user
message/draft, and showed no assistant success. A clean full-page screenshot
and DOM snapshot were captured; the Browser console had no warnings or errors.
Durable inspection showed one cancelled send run
(`88c86e81-68c3-49b5-9ebf-b2d627860550`), one user message, no assistant
message, and ordered events `generation.started`, `generation.accepted`, two
phase changes, `generation.cancel_requested`, and `generation.cancelled`.
B-012: Implemented.

B-013 initially exposed a hydration/replay handoff bug: the Web hook read the
browser-only generation checkpoint during render, while the server rendered
the idle composer, and a reconnect could finish with `[DONE]` after the durable
terminal event had already been committed. The Web hook now restores the
checkpoint after hydration and reconciles a closed replay against the durable
generation status. Focused Web coverage verifies both paths; Vitest excludes
the Playwright suite from the unit-test configuration so the focused command
does not load browser tests as Vitest modules.

B-013 was rerun on fresh disposable chat
`01a06139-eb9b-786e-a57b-e0ed5b481158` with `B013-DISCONNECT`. The page was
reloaded during the delayed stream and rendered the original user message plus
`Scripted response: B013-DISCONNECT`; the composer returned to the idle Submit
state. The Browser DOM and full-page screenshot were captured, and the Browser
console had no warnings or errors. Durable inspection showed committed run
`ad63fb87-0867-40ed-90ea-741c2f017af6`, exactly one user message
(`01a06139-f8a8-7e8b-9247-d4054c25e036`), exactly one assistant message
(`01a0613a-04fc-781b-9e60-91a20c4b7f28`), and seven ordered events ending in
`generation.committed`. B-013: Implemented.

The repeatable Web harness now lives in
`apps/web/tests/e2e/chat-playbook.spec.ts`. It contains one serial Playwright
test for every B-001–B-025 scenario, shares deterministic chat/stream/status
helpers, and can run the whole matrix or a single scenario with
`pnpm --filter @hominem/web test:e2e --project=chat -g 'B-013'`. The suite uses
the authenticated state produced by `api e2e:setup` and never starts or stops
the running services. A full run still requires `E2E_SESSION_COOKIE` in the
shell that launches Playwright.

Environment checkpoint — 2026-09-02: the API health endpoint returned HTTP
200 and the Web root returned its expected unauthenticated HTTP 302 response.
The iOS simulator inventory contained no booted device, so Omiro evidence is
not runnable until a user-started simulator is available. The documented local
database configuration is now available for live inspection. B-011 and later
failure/replay scenarios remain unstarted until their supported test-environment
controls and evidence access are available.

### Playwright evidence continuation — 2026-09-02

The repeatable Playwright suite now captures a per-scenario JSON attachment,
full-page screenshot, DOM snapshot, API response status/request IDs, durable
generation/message state, and duplicate checks. It uses the direct local API
URL for durable inspection and a unique provider-failure marker per run.

Targeted and ordered runs passed B-001–B-017, B-018, B-019, B-022–B-025,
including regeneration, retry correlation, cancellation, replay/reload,
authorization isolation, message actions, clipboard permission, smallest
viewport, and keyboard submission. B-020 and B-021 are explicitly skipped with
the harness blocker: the chat loader fetches messages during server-side route
rendering, outside Playwright browser request interception. The final full run
also encountered an intermittent Web dev-server SSR error (`DialogRoot` calling
`useContext` across mixed React runtime instances) before B-001 rendered; a
clean Web restart is required before the final ordered matrix can be accepted.

### Omiro Maestro evidence — 2026-09-02

Added an ordered, iPhone-only Maestro evidence harness for the mobile side of
Task 003:

- `apps/omiro/tests/flows/chat-core.yaml`
- `apps/omiro/tests/flows/chat-tools.yaml`
- `apps/omiro/tests/flows/chat-recovery.yaml`
- `apps/omiro/tests/flows/chat-actions.yaml`
- `apps/omiro/tests/e2e/chat-playbook.yaml` (ordered runner)

Run it against the user-started app/API with Java 17 and the installed Maestro
binary:

```bash
export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"
export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
/Users/charlesponti/.maestro/bin/maestro test \
  -e MAESTRO_RUN_ID="$(date +%s)" \
  apps/omiro/tests/e2e/chat-playbook.yaml
```

The flows capture screenshots for each acceptance state and use stable Omiro
test IDs for navigation, composer, chat list, loading, and error surfaces.
Tool confirmation uses the app's accessibility labels. B-013/B-014 transport
sever/replay overlap and B-016/B-019 cross-account authorization remain
explicit API/testkit checkpoints: Maestro can relaunch the app and inspect the
recovered UI, but it cannot sever one HTTP stream or create the second owned
session without an additional supported runtime control. These flows therefore
do not claim those assertions by themselves.

The first live smoke run was blocked before B-001 because the running app did
not return to the inbox for `hakumi-dev://`; it remained on an existing chat,
so `inbox-composer-input` was not visible. The app was not restarted or
modified. This is a harness/runtime navigation blocker to resolve before
recording Omiro scenarios as passing.

### Playwright rerun — 2026-09-02

After refreshing the workspace install to the merged lockfile and restarting
the Web runtime, the ordered authenticated run produced 23 passing scenarios,
two explicit skips, and one test assertion failure. The initial B-001 failure
was the stale mixed React runtime (`react@19.2.8` with `react-dom@19.2.3`),
which was resolved by reinstalling dependencies and restarting Web. B-001
through B-024 then passed, except B-020 and B-021, which remain skipped because
their server-side loader requests cannot be intercepted from the browser.
B-025 was corrected to assert the second keyboard-submitted exchange rather
than a concatenated assistant response and passed in a focused rerun.

Follow-up smoke verification resolved B-004's navigation-stack blocker. The
core flow successfully unwinds the new-chat route to the inbox, reopens the
same chat, and captures `/tmp/omiro-task003-b004-navigation`. A subsequent
ordered run reached B-005 and initially exposed an incorrect ID selector. The
flow now targets the existing native accessibility label `arrow.clockwise`; the
rerun completed B-005 and captured `/tmp/omiro-task003-b005-regeneration`. This
proves the Omiro interaction path and screenshot artifact, but does not by
itself prove the required durable generation/message duplicate assertions,
which remain API/testkit evidence requirements.

The next Omiro tool-group run passed B-006 but stopped at B-007. The captured
screen showed `list_collections` for the B-007 request because the live API
process had not reloaded the updated scripted-provider matcher and was still
using all prior user messages when selecting a tool. The matcher now uses the
latest user request, with a regression test covering B-006 history followed by
B-007 creation. Focused API tests (286 passing) and API typecheck pass. The
live rerun after the API watcher loaded the change first showed the B-007 user
message without any confirmation/tool card; durable inspection showed the API
had persisted `awaiting_confirmation` and a pending `create_collection` call.
Omiro was not refetching messages on `confirmation.required`, so that cache
refresh defect was fixed and covered by the Omiro hook test. The next run
displayed the confirmation card and captured
`/tmp/omiro-task003-b007-confirmation-pending`, but approval did not reach the
API: the run remained `awaiting_confirmation`. Stable IDs were added to the
approve/reject controls and the flow now uses them. B-007 remains partial until
approval produces the durable resumed/committed state; the latest failure
artifact is under `/tmp/omiro-task003-b006-009-approved/2026-09-02_025038`.
The confirmation buttons now also expose `accessibilityRole="button"`; a
follow-up run still left the latest generation in `awaiting_confirmation`, so
the remaining seam is the authenticated Omiro RPC callback rather than native
button discovery. That artifact is under
`/tmp/omiro-task003-b006-009-role/2026-09-02_025658`.

## Exit gate

Task 003 is `Implemented` only when:

- The SDK façade executes every required operation and scenario against the
  test database through real routes and runtime components.
- Provider scripts cover text, reasoning, fragmented/multiple tools,
  confirmation, tool/provider failure, retry, usage, cancellation, and
  disconnect timing.
- Failure-injection tests prove durable terminal behavior and identify whether
  state was persisted, published, replayed, or intentionally absent.
- Replay-overlap tests prove lossless, duplicate-safe convergence.
- Web and Omiro tests reduce equivalent canonical events to equivalent semantic
  state.
- Cleanup leaves no test users, chats, messages, runs, events, snapshots, or
  tool effects.
- Focused Chat, DB, API, Web, and Omiro tests, API typecheck/build/lint, and
  `pnpm run check` pass.
- Browser and iOS simulator flows are recorded when the user-started services
  are available.
- Evidence is recorded using the Hominem evidence template.

Do not start Task 004 until every item above has an observable passing artifact.
