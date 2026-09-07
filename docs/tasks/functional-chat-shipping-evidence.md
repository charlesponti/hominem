---
title: 'Complete functional chat shipping evidence'
status: 'Implemented'
priority: 'high'
labels: [chat, e2e, browser, ios, evidence]
depends_on: [chat-runtime-consolidation.md]
blocks: []
estimated_size: 'L'
---

## Outcome

Demonstrate that the canonical chat flow works at the required real
API-to-Web-browser and API-to-Apple-only-Omiro-simulator boundaries, while
deterministic Web loading and recovery behavior is proven at the owning
component, hook, and SSR-loader boundaries.

## Scope

In scope: ordered Web behavior and Browser/Playwright/Maestro scenarios,
focused Vitest/MSW coverage for deterministic Web loading and recovery states,
durable-state cross-checks, artifacts, final validation, and disposable-data
cleanup. Out of scope: adding E2E proxying or server-side interception solely
to induce deterministic dependency failures, implementing unrelated API test
infrastructure, or changing product behavior solely to make evidence runnable.

The durable chat contract and test infrastructure are governed by
`docs/chat.generation.md`, `docs/chat.testing.md`, and the chat ADRs. Task 012
owns Omiro B-011 cancellation investigation and evidence. B-011 is
therefore deferred from this task's active work sequence and is not counted as
an accepted result here.

## Work sequence

| ID    | Work item                 | Owner boundary                           | Depends on                                                   | Validation / artifact                                              | Done when                                                                                                                                                                                                          |
| ----- | ------------------------- | ---------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| W-001 | Prepare the run           | local services, auth, Browser, simulator | `docs/chat.generation.md`, `docs/chat.testing.md`, chat ADRs | environment manifest                                               | Revision, URLs, viewport/device, authenticated session, and run ID are recorded.                                                                                                                                   |
| W-002 | Run Web matrix            | Vitest/MSW + Playwright/Web              | Web test setup; W-001 for the Playwright subset              | one manifest row per B-001–B-025 with boundary-specific evidence   | B-001–B-019 and B-022–B-025 have Playwright evidence; B-020/B-021 have focused Vitest/MSW evidence and optional browser smoke; each result records only the assertions and artifacts owned by its tested boundary. |
| W-003 | Run Omiro matrix          | Maestro/Omiro                            | W-001                                                        | one artifact row per applicable scenario, excluding deferred B-011 | Equivalent semantic states and Apple-only layout/accessibility states are recorded for this task's scenarios.                                                                                                      |
| W-004 | Resolve confirmed defects | owning Web/Omiro/testkit boundary        | W-002 or W-003                                               | focused regression test + rerun                                    | Only defects required by a failed active scenario are fixed.                                                                                                                                                       |
| W-005 | Reconcile evidence        | task record/evidence manifest            | W-002–W-004                                                  | reviewed manifest                                                  | Implemented, Partial, Open, and Blocked results are explicit; no raw disposable IDs are embedded here.                                                                                                             |
| W-006 | Clean disposable data     | testkit/database inspector               | W-005 + user confirmation                                    | cleanup receipt                                                    | Exact listed records are deleted and absence is verified.                                                                                                                                                          |
| W-007 | Run release gate          | repo validation                          | W-006                                                        | command output                                                     | Focused suites, typechecks, lint, builds, full check, and diff check pass.                                                                                                                                         |

The MSW portion of W-002 may run without W-001 or live services. The
Playwright portion of W-002 and W-003 may run in parallel only after W-001, but
each matrix is serial. W-004 blocks the affected rerun only; unrelated
scenarios do not silently bypass an earlier failed scenario.

## Acceptance criteria

- [x] AC-001: Every Web scenario has its required evidence type: Playwright for browser-owned scenarios, focused component/hook MSW coverage for client states, and Node MSW SSR-loader coverage for server-rendered states such as B-020/B-021.
- [x] AC-002: Every applicable Omiro scenario owned by this task has Maestro and visual evidence.
- [x] AC-003: Every failed scenario has either a focused fix and rerun or an exact blocker.
- [x] AC-004: Cleanup is confirmed, exact, and verified.
- [x] AC-005: The final validation set passes at the recorded revision.

## Evidence record

The authoritative artifact is a generated run manifest containing the
environment and boundary, scenario, visible/state transitions, applicable
correlation and durable state, boundary-appropriate test output or
screenshots/DOM, duplicate checks where applicable, and cleanup receipt. The
task document stores only the summary and links to that manifest. Focused
client/SSR MSW scenarios do not require real durable IDs or browser artifacts
unless those are part of the specific acceptance assertion.

The run manifest for this task was reviewed and closed out; per the
`docs/tasks/artifacts/` scratch-evidence lifecycle, it was removed once this
task reached `Implemented`.

## Current run status

- Playwright discovery registered all 26 entries (auth setup plus B-001–B-025).
- The local scripted `api` and `web` services run via Portless at
  `https://api.lvh.me:4200` and `https://web.lvh.me:4200`. An authenticated
  disposable session was prepared with `pnpm --filter @hominem/api e2e:setup`.
- Ordered Playwright evidence currently passes B-001–B-019 and B-022–B-025.
  The B-010 retry defect was fixed in Web: the dedicated retry path now clears
  its temporary assistant message when the retry settles, preventing a
  duplicate streaming message after the committed response is reloaded.
- B-020 and B-021 do not require using Playwright failure injection.
  The chat loader fetches messages during SSR, so browser request interception
  is the wrong control boundary for these deterministic states. The focused
  coverage is now implemented in
  `apps/web/app/lib/hooks/use-chat-messages.msw.test.tsx` (jsdom/MSW client
  error and retry) and
  `apps/web/app/routes/chat/chat.$chatId.loader.msw.test.ts` (Node MSW 503 and
  500 SSR-loader preservation). The existing Playwright attempts remain
  optional smoke coverage and explicitly record the server-side interception
  limitation.
- The generated Playwright HTML report and per-scenario artifacts are preserved
  under `apps/web/playwright-report` and `apps/web/test-results`. Disposable
  records were deleted and verified by the W-006 cleanup receipt (scratch
  evidence, removed after this task reached `Implemented`).
- Omiro now launches on the booted iPhone 17 Pro after rebuilding the native
  development client and reaches an authenticated chat through the local API
  at `http://localhost:4040`. The named `chat-core.yaml` Maestro flow passes
  B-001–B-005 with screenshots for direct load, send, new chat, navigation,
  and regeneration.
- The named `chat-tools.yaml` flow now passes B-006–B-009 in isolated fresh
  chats. B-007 approval and B-008 rejection reach the API, produce the
  expected terminal response, remove the confirmation controls, and leave
  no pending confirmation card. B-009 preserves the failed-tool card. The
  scripted provider was corrected so the B-008 marker emits a confirmation
  tool call initially and only emits the rejection response after the tool
  result. Screenshots are preserved at `/tmp/omiro-task003-b006-tool-success`,
  `/tmp/omiro-task003-b007-confirmation-pending`,
  `/tmp/omiro-task003-b007-approved`,
  `/tmp/omiro-task003-b008-confirmation-pending`,
  `/tmp/omiro-task003-b008-rejected`, and
  `/tmp/omiro-task003-b009-tool-failure`.
- Omiro B-010 now passes the provider-failure, inline Retry, and successful
  retry flow. The activity timeline is rendered with the newest chat content,
- and the stop control has a stable automation identifier. B-011 has been
  split into independent follow-up Task 012 because its remaining issue is
  Omiro native callback delivery, not a prerequisite for the rest of this
  shipping-evidence matrix. Its reproduction, evidence, attempted fixes, and
  acceptance criteria are recorded in
  `omiro-generation-cancellation.md`.

- W-007 release gate completed: `pnpm run check` passed with 28 successful
  Turbo tasks, and `git diff --check` passed after the final client/test
  adjustments.

## Test rule

Use Vitest with MSW for deterministic Web client and SSR dependency states such
as loading, latency, empty responses, HTTP errors, and recovery. Test the real
component, hook, or loader and mock only the external dependency at its
boundary. Do not spend engineering time adding Playwright proxying or
server-side interception solely to make these states injectable. Keep
Playwright for real browser concerns such as navigation, hydration, layout,
accessibility, and cross-process transport behavior.

## Exit gate

Mark Implemented only when AC-001–AC-005 pass. Keep Open or Partial when any
scenario in this task is unverified, blocked, or awaiting cleanup. B-011 is
owned by Task 012 and must not be counted as passing in this task merely
because it was removed from this matrix.
