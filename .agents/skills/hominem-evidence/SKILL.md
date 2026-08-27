---
name: hominem-evidence
description: Decide what evidence proves a change is complete, and produce the completion report before reporting work done. Use before ending any turn that changed code, config, docs, or infrastructure in this repo — this is the mandatory validation standard referenced by AGENTS.md.
---

# Hominem evidence standard

Full rationale lives in [docs/evidence.md](../../../docs/evidence.md). A
change is complete only when its validation proves the behavior or artifact
that changed, in the environment where it matters. Type checks, linting,
builds, and unrelated tests are supporting evidence — they do not by
themselves prove a user interaction, visual layout, external side effect, or
deployment outcome.

## Pick the minimum evidence for the change

| Change | Minimum evidence |
| --- | --- |
| Documentation | `git diff --check`, targeted link checks when links changed, a rendered/read-through review |
| Pure function | Focused unit test covering the changed input and output |
| API or RPC | Targeted integration test asserting the request/response contract |
| Web UI | Browser interaction and visual inspection of each changed acceptance state |
| Omiro UI | Maestro flow on the booted iPhone simulator and visual inspection of each changed acceptance state |
| Database | Migration execution and schema/behavior verification |
| External write | Assertion against the resulting external record or state |
| Deployment | Resolved target and confirmed final remote deployment state |

This table is a floor, not a substitute for more evidence when the risk
demands it. Refer to [docs/evidence.md](../../../docs/evidence.md)'s "Choose
evidence by change" section for the full decision rationale per change type
(refactor, constrained composition, framework capability, etc).

## Interactive behavior

A control that renders is not validated until its action and resulting state
are observed. Validate every state named in the acceptance criteria: entry,
active, focused, loading, cancellation, failure, return, recovery. If an
app-owned control or outcome can't be selected or observed reliably, resolve
that testability gap or report it — don't replace it with a fuzzy assertion.

## Constrained layouts

Before composing controls into a constrained surface, prove the complete
composition fits at the smallest supported viewport/device/container named by
the owning app or feature documentation. If the chosen primitive can't meet
the approved behavior within those constraints, stop and report the
limitation — don't improvise a different product behavior.

## Handling a failed or unavailable check

- **Failed**: fix it or report the failure — don't call the change complete.
- **Skipped or unavailable**: the behavior remains unverified — don't call the
  change complete.
- **Ambiguous, stale-build, or non-targeted**: not evidence for the changed
  behavior — re-run a targeted check.
- **Not applicable**: state why the category doesn't apply.

Never call work complete, update acceptance tests as though they passed, or
claim a result based on a check that didn't exercise the changed behavior.

## Completion report

Use this structure when reporting completed work:

```markdown
## Validation

- Scope:
- Command or flow:
- Environment:
- Observed result:
- Artifacts:
- Unverified:
```

Name the evidence, its scope, and anything that remains unverified. Do not
replace evidence with an assumption.
