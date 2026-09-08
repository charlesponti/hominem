---
title: 'Per-user runway budget caps'
status: 'Proposed'
priority: 'low'
labels: [finance]
depends_on: []
estimated_size: 'S'
---

## Outcome

The live ledger runway in Florin shows a real variable allowance
instead of $0: users configure monthly category caps once, and
`computeLedgerRunway` converts them to the weekly allowance every call.

## Scope

In scope: a home for per-user runway assumptions (monthly category
caps; optionally liquid types, lookback, and projection windows —
mirrors the retired `runway-assumptions.json`), threading them into
the runway page's loader call (the service already takes them as
args), and a minimal edit UI.
Out of scope: changing the projection math, touching the manual
what-if calculator on the same page.

## Work sequence

| ID | Work item | Owner boundary | Depends on | Validation / artifact | Done when |
| --- | --- | --- | --- | --- | --- |
| W-001 | Choose the settings home | Finance product | — | recorded decision | The home is explicit and consistent with the splits decision |
| W-002 | Thread caps into the runway loader | `apps/finance` runway route | W-001 | route tests | A configured cap changes the displayed allowance |
| W-003 | Minimal edit UI | `apps/finance` | W-002 | component tests | Caps can be added, changed, and removed |

## Acceptance criteria

- [ ] AC-001: With no caps configured, the page keeps showing $0 allowance with its current note.
- [ ] AC-002: A configured cap flows into the weekly allowance at the documented divisor.
- [ ] AC-003: App gates for the touched areas stay green.

## Exit gate

Close only when the settings home decision and all acceptance
criteria are recorded.
