---
title: 'Per-user Copilot description-split rules'
status: 'Proposed'
priority: 'low'
labels: [finance, import]
depends_on: []
estimated_size: 'S'
---

## Outcome

A Copilot `account`-label collision between two real accounts (the
Apple Savings / American Express Savings precedent) can be recorded
per user and applied during import preflight, instead of living in a
hardcoded list or a checkout-local JSON file.

## Scope

In scope: a home for per-user split rules (shape: source label,
target account, triggering descriptions, always-credit subset —
mirrors the retired `description-account-splits.json`), threading it
through `createCopilotImportPlan`'s existing `forcedCreditLines` path
(the plumbing already exists and defaults to empty), and preflight
surfacing.
Out of scope: changing historical rows (already resolved in the
backfill), auto-minting accounts (resolution still requires human
confirmation).

## Work sequence

| ID | Work item | Owner boundary | Depends on | Validation / artifact | Done when |
| --- | --- | --- | --- | --- | --- |
| W-001 | Choose the settings home | Finance product | — | recorded decision | The home (settings table, user metadata, or config surface) is explicit |
| W-002 | Thread rules into preflight | `services/api` import routes | W-001 | import unit tests | A configured collision redirects and force-credits on a fixture export |
| W-003 | Surface in the app | `apps/finance` import UI | W-002 | component tests | Review shows the redirect before confirm |

## Acceptance criteria

- [ ] AC-001: No user-specific collision is hardcoded in generic code.
- [ ] AC-002: A fixture export with a colliding label resolves per the configured rule.
- [ ] AC-003: Package gates for the touched areas stay green.

## Exit gate

Close only when a real collision (or an explicit decision that none
exists) and all acceptance criteria are recorded.
