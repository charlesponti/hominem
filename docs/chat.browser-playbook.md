# Functional Chat Browser Playbook

This playbook defines repeatable browser evidence for the functional chat
release gate. It tests the running Web application against the running API and
real persistence. Provider permutations and deterministic dependency failure
injection belong in focused Vitest/MSW or API-local `HominemTests` tests.
Browser runs prove that real responses become correct user-visible state and
survive lifecycle transitions where browser or device behavior is part of the
contract.

## Preconditions

- Web and API services are running at the documented local URLs.
- The browser is authenticated as a disposable test user or an explicitly
  authorized development user.
- The target chat is owned by that user and contains no irreplaceable data.
- Browser console logs and the API log stream are available for correlation.
- Record the git revision, browser viewport, API/Web URLs, chat ID, user/test
  label, and timestamp before starting.

Never use a production conversation for destructive or failure-path testing.
Create a disposable chat and record its ID instead.

## Evidence record

For each scenario, record:

| Field | Required value |
| --- | --- |
| Scenario | Stable scenario name below |
| Boundary | Web ↔ API, plus route if known |
| Environment | Revision, URLs, viewport, browser, user/chat label |
| Action | Exact user action and timing |
| Observed state | Visible messages, tool state, loading/error state, controls |
| Recovery state | Cursor/reconnect/reload result and duplicate check |
| Correlation | Generation ID, durable sequence, request ID when visible in logs |
| Artifacts | Screenshot, DOM snapshot, console/API log excerpt, or video |
| Result | `Implemented`, `Partial`, `Open`, or `Blocked` |
| Unverified | Any assertion that could not be observed |

Use one artifact per meaningful state transition, not a screenshot dump. Never
record provider arguments, credentials, or sensitive message content in logs.

## Standard run protocol

1. Open the disposable chat by direct URL.
2. Confirm the initial state: chat title, existing message count, composer,
   and absence of unexpected console errors.
3. Perform exactly one scenario action.
4. Capture visible state after each transition: preparing, streaming,
   tool/confirmation, terminal, and recovery.
5. Cross-check API logs for the generation ID and durable sequence order.
6. Reload or reconnect only where the scenario requires it.
7. Verify semantic state, not timing or presentation details: messages, tool
   lifecycle, terminal outcome, and absence of duplicates.
8. Record the evidence row before moving to the next scenario.
9. Delete the disposable chat only after all artifacts are collected.

## Scenario matrix

### Core send and navigation

| ID | Action | Observable evidence |
| --- | --- | --- |
| B-001 | Open a completed disposable chat directly | History loads; messages and tool cards match persisted state; no console error |
| B-002 | Send a normal message | User message appears once; streamed assistant response completes; one terminal outcome; refresh preserves it |
| B-003 | Start a chat from the new-chat entry point | New URL/chat identity; first message and response persist; chat list contains the new chat |
| B-004 | Navigate chat list → chat → back → chat | Correct chat loads each time; no stale conversation or cross-chat messages |
| B-005 | Regenerate the latest assistant response | New generation is visible; prior history remains; final response is not duplicated |

### Tools and confirmation

| ID | Action | Observable evidence |
| --- | --- | --- |
| B-006 | Trigger a successful tool call | Tool card transitions pending → completed; assistant continuation renders |
| B-007 | Trigger confirmation-required tool and approve | Confirmation is visible; approval resumes the same semantic flow; result and terminal state persist |
| B-008 | Trigger confirmation-required tool and reject | Rejection is visible; no execution-success state appears; documented continuation/terminal rule is followed |
| B-009 | Trigger a tool failure | Failed tool state is visible; no fabricated successful result; recovery control behaves correctly |

### Failure, cancellation, and transport recovery

These scenarios require a scripted provider or failure-injection mode exposed by
the test environment. The browser must not depend on arbitrary production
provider behavior.

| ID | Action | Observable evidence |
| --- | --- | --- |
| B-010 | Provider failure then retry | Safe error appears; durable failed state survives reload; retry creates a new attempt without rewriting history |
| B-011 | Cancel before execution | Cancel wins before provider/tool execution; durable terminal state is authoritative |
| B-012 | Cancel while streaming or persisting | UI stops cleanly; no false success; first durable terminal decision wins |
| B-013 | Disconnect during text/tool/confirmation/finalization | Transport ends without fabricated terminal state; reconnect recovers from durable history |
| B-014 | Reconnect with overlapping replay | Existing events are not applied twice; messages/tool cards remain single and ordered |
| B-015 | Reload during awaiting confirmation | Confirmation remains actionable and owned by the same generation |

### Fresh launch and authorization

| ID | Action | Observable evidence |
| --- | --- | --- |
| B-016 | Close/reopen the browser on a completed chat | Fresh reducer reconstruction equals the pre-close semantic state |
| B-017 | Reload during an active generation | Replay/live handoff completes without lost or duplicate durable events |
| B-018 | Open an unowned chat URL | Safe authorization failure; no private messages, tools, or event data are rendered |
| B-019 | Attempt unowned send, regenerate, cancel, replay, delete, and confirmation | Every operation is denied consistently; no durable state changes |

### Message and presentation behavior

| ID | Action | Observable evidence |
| --- | --- | --- |
| B-020 | Load a slow or empty chat | Vitest/MSW proves loading/empty transitions; optional browser smoke confirms presentation |
| B-021 | Force a load/generation error | Vitest/MSW proves error mapping and recovery; optional browser smoke confirms presentation |
| B-022 | Edit and delete a user message | Edit persists; delete confirmation is visible; deletion updates the conversation and chat list |
| B-023 | Use copy, share, listen, and regenerate actions | Each action has correct enabled/loading/error state and does not alter unrelated messages |
| B-024 | Resize to the smallest supported viewport | Composer, tool cards, confirmation, error, and long messages remain usable |
| B-025 | Use keyboard and assistive labels | Submit/cancel/confirmation/retry/delete controls are keyboard reachable and named |

## Scenario completion rules

A browser scenario is `Implemented` only when the visible assertion, the
corresponding API/durable assertion, and the required artifact are all present.
If the API result is correct but browser state is unverified, mark it
`Partial`. If the environment cannot produce the required state, mark it
`Blocked` and record the exact dependency. Do not infer browser proof from a
unit test or SDK test.

For B-020 and B-021, the authoritative behavioral result is focused
Vitest/MSW evidence because the failure is induced at the Web client or SSR
dependency boundary. A browser smoke artifact is supplementary and is not a
reason to build server-side request interception into Playwright.

Run B-001 through B-005 first, then B-006 through B-009, then B-010 through
B-019, and finally B-020 through B-025. A later scenario may be run only after
the preceding scenario has a recorded result, even when the later scenario is
easier.
