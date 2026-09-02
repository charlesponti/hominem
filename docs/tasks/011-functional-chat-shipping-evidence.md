---
title: 'Complete functional chat shipping evidence'
status: 'Open'
priority: 'high'
labels: [chat, e2e, browser, ios, evidence]
depends_on: [003-chat-e2e-test-infrastructure.md, 004-typed-generation-boundaries.md, 005-generation-crash-recovery.md, 006-generation-cursor-recovery.md, 007-client-convergence.md, 008-generation-observability.md, 010-remove-generation-compatibility.md]
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

## Work sequence

| ID | Work item | Owner boundary | Depends on | Validation / artifact | Done when |
| --- | --- | --- | --- | --- | --- |
| W-001 | Prepare the run | local services, auth, Browser, simulator | Tasks 003–008 | environment manifest | Revision, URLs, viewport/device, authenticated session, and run ID are recorded. |
| W-002 | Run Web matrix | Playwright/Web | W-001 | one manifest row per B-001–B-025 | Scenarios run serially; each result has visible, API/durable, artifact, and duplicate evidence. |
| W-003 | Run Omiro matrix | Maestro/Omiro | W-001 | one artifact row per applicable scenario | Equivalent semantic states and Apple-only layout/accessibility states are recorded. |
| W-004 | Resolve confirmed defects | owning Web/Omiro/testkit boundary | W-002 or W-003 | focused regression test + rerun | Only defects required by a failed active scenario are fixed. |
| W-005 | Reconcile evidence | task record/evidence manifest | W-002–W-004 | reviewed manifest | Implemented, Partial, Open, and Blocked results are explicit; no raw disposable IDs are embedded here. |
| W-006 | Clean disposable data | testkit/database inspector | W-005 + user confirmation | cleanup receipt | Exact listed records are deleted and absence is verified. |
| W-007 | Run release gate | repo validation | W-006 | command output | Focused suites, typechecks, lint, builds, full check, and diff check pass. |

W-002 and W-003 may run in parallel only after W-001, but each matrix is
serial. W-004 blocks the affected rerun only; unrelated scenarios do not
silently bypass an earlier failed scenario.

## Acceptance criteria

- [ ] AC-001: Every runnable Browser scenario has complete visible and durable evidence.
- [ ] AC-002: Every applicable Omiro scenario has Maestro and visual evidence.
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
- Omiro evidence is still `Blocked`: the booted iPhone 17 Pro launches the
  Expo development-client launcher rather than the Omiro route, and opening
  the Metro URL through the configured `hakumi-dev` development-client link
  fails with `LSApplicationWorkspaceErrorDomain` code 115. The app bundle is
  configured for `http://localhost:4040`, which is reachable now, but no
  authenticated Omiro session reached a chat screen for Maestro.
- The attempted `maestro test tests/e2e/chat-playbook.yaml` run confirms the
  same dependency: it stops in `reset-to-home.yaml` at the optional
  `BackButton` interaction while the development-client launcher is active;
  it does not reach an Omiro chat flow. Maestro debug output is preserved at
  `/Users/charlesponti/.maestro/tests/2026-09-02_105213`.

## Exit gate

Mark Implemented only when AC-001–AC-005 pass. Keep Open or Partial when any
scenario is unverified, blocked, or awaiting cleanup. Do not claim a blocked
scenario as passing.
