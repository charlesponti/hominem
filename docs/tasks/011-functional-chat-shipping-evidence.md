---
title: 'Complete functional chat shipping evidence'
status: 'Open'
priority: 'high'
labels: [chat, e2e, browser, ios, evidence]
depends_on: []
blocks: []
estimated_size: 'L'
---

## Outcome

Demonstrate that the canonical chat flow works at the production API-to-Web
browser and API-to-Apple-only-Omiro simulator boundaries.

## Scope

In scope: ordered Browser/Playwright and Maestro scenarios, durable-state
cross-checks, artifacts, final validation, and disposable-data cleanup. Out of
scope: implementing API test infrastructure or changing product behavior solely
to make evidence runnable.

The durable chat contract and test infrastructure are governed by
`docs/chat.generation.md`, `docs/chat.testing.md`, and the chat ADRs. Task 012
owns Omiro B-011 cancellation investigation and evidence. B-011 is
therefore deferred from this task's active work sequence and is not counted as
an accepted result here.

## Work sequence

| ID | Work item | Owner boundary | Depends on | Validation / artifact | Done when |
| --- | --- | --- | --- | --- | --- |
| W-001 | Prepare the run | local services, auth, Browser, simulator | `docs/chat.generation.md`, `docs/chat.testing.md`, chat ADRs | environment manifest | Revision, URLs, viewport/device, authenticated session, and run ID are recorded. |
| W-002 | Run Web matrix | Playwright/Web | W-001 | one manifest row per B-001–B-025 | Scenarios run serially; each result has visible, API/durable, artifact, and duplicate evidence. |
| W-003 | Run Omiro matrix | Maestro/Omiro | W-001 | one artifact row per applicable scenario, excluding deferred B-011 | Equivalent semantic states and Apple-only layout/accessibility states are recorded for this task's scenarios. |
| W-004 | Resolve confirmed defects | owning Web/Omiro/testkit boundary | W-002 or W-003 | focused regression test + rerun | Only defects required by a failed active scenario are fixed. |
| W-005 | Reconcile evidence | task record/evidence manifest | W-002–W-004 | reviewed manifest | Implemented, Partial, Open, and Blocked results are explicit; no raw disposable IDs are embedded here. |
| W-006 | Clean disposable data | testkit/database inspector | W-005 + user confirmation | cleanup receipt | Exact listed records are deleted and absence is verified. |
| W-007 | Run release gate | repo validation | W-006 | command output | Focused suites, typechecks, lint, builds, full check, and diff check pass. |

W-002 and W-003 may run in parallel only after W-001, but each matrix is
serial. W-004 blocks the affected rerun only; unrelated scenarios do not
silently bypass an earlier failed scenario.

## Acceptance criteria

- [ ] AC-001: Every runnable Browser scenario has complete visible and durable evidence.
- [ ] AC-002: Every applicable Omiro scenario owned by this task has Maestro and visual evidence.
- [ ] AC-003: Every failed scenario has either a focused fix and rerun or an exact blocker.
- [ ] AC-004: Cleanup is confirmed, exact, and verified.
- [ ] AC-005: The final validation set passes at the recorded revision.

## Evidence record

The authoritative artifact is a generated run manifest containing environment,
scenario, correlation, durable state, screenshots/DOM, console/API excerpts,
duplicate checks, and cleanup receipt. The task document stores only the
summary and links to that manifest.

## Current run status

- Playwright discovery registered all 26 entries (auth setup plus B-001–B-025).
- The local scripted API and Web services are running through Portless at
  `https://api.lvh.me:4200` and `https://web.lvh.me:4200`. An authenticated
  disposable session was prepared with `@hominem/api e2e:setup`.
- Ordered Playwright evidence currently passes B-001–B-019 and B-022–B-025.
  The B-010 retry defect was fixed in Web: the dedicated retry path now clears
  its temporary assistant message when the retry settles, preventing a
  duplicate streaming message after the committed response is reloaded.
- B-020 and B-021 remain `Blocked`: the chat loader fetches messages during SSR,
  outside Playwright's browser request interception, and the running test
  environment has no supported server-side load-failure control. The tests
  record this exact blocker rather than claiming a simulated failure passed.
- The generated Playwright HTML report and per-scenario artifacts are preserved
  under `apps/web/playwright-report` and `apps/web/test-results`. Disposable
  records have not been deleted; cleanup still requires the W-006 confirmation
  checkpoint.
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
-  and the stop control has a stable automation identifier. B-011 has been
  split into independent follow-up Task 012 because its remaining issue is
  Omiro native callback delivery, not a prerequisite for the rest of this
  shipping-evidence matrix. Its reproduction, evidence, attempted fixes, and
  acceptance criteria are recorded in
  `012-omiro-generation-cancellation.md`.

## Exit gate

Mark Implemented only when AC-001–AC-005 pass. Keep Open or Partial when any
scenario in this task is unverified, blocked, or awaiting cleanup. B-011 is
owned by Task 012 and must not be counted as passing in this task merely
because it was removed from this matrix.
