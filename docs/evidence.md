# III. Evidence

A change is complete only when its validation proves the behavior or artifact that changed in the environment where it matters. Choose evidence for the risk of the change, not from habit.

Type checks, linting, builds, and unrelated tests are supporting evidence. They do not by themselves prove a user interaction, visual layout, external side effect, or deployment outcome.

## Choose evidence by change

- **Documentation:** Check whitespace, links changed by the edit, headings, and the rendered or read-through result.
- **Pure computation or contract:** Run a targeted test for the changed input and output.
- **Refactor:** Run the focused behavior tests, then the type check or build needed to prove the public boundary is unchanged.
- **User-visible or interactive behavior:** Test the states and transitions named in the acceptance criteria on the target device or in the target browser.
- **Constrained composition:** Check the complete layout at the smallest supported viewport, device, or container named by the owning app or feature documentation.
- **Database change:** Apply the migration in the supported environment and verify the resulting schema and affected behavior.
- **External write:** Check the resulting external state and confirm the target, identity, and write outcome.
- **Deployment:** Verify the resolved target and the final remote deployment state.
- **Framework or library capability:** Prove the exact capability with a small test before building on it.

## Minimum evidence

| Change | Minimum evidence |
| --- | --- |
| Documentation | `git diff --check`, targeted link checks when links changed, and a rendered or read-through review |
| Pure function | Focused unit test covering the changed input and output |
| API or RPC | Targeted integration test asserting the request and response contract |
| Web UI | Browser interaction and visual inspection of each changed acceptance state |
| Omiro UI | Maestro flow on the booted iPhone simulator and visual inspection of each changed acceptance state |
| Database | Migration execution and schema or behavior verification |
| External write | Assertion against the resulting external record or state |
| Deployment | Resolved target and confirmed final remote deployment state |

The minimum is a floor, not a substitute for additional evidence required by the risk.

## Interactive behavior

A control that renders is not validated until its action and resulting state are observed. Validate every state or transition named in the acceptance criteria, including entry, active, focused, loading, cancellation, failure, return, or recovery states when the change affects them.

Automation needs a deterministic observation path. If an app-owned control or outcome cannot be selected or observed reliably, resolve that testability gap or report it before completion. Do not replace it with a fuzzy assertion and call the interaction verified.

## Constrained layouts

Before composing controls into a constrained surface, prove that the complete composition fits at the smallest supported viewport, device, or container named by the owning app or feature documentation. If the chosen primitive cannot meet the approved behavior within those constraints, stop and report the limitation; do not improvise a different product behavior.

## Validation failures

- **Failed:** The implementation did not meet the check. Fix it or report the failure.
- **Skipped or unavailable:** The required behavior remains unverified. Do not call the change complete.
- **Ambiguous, stale-build, or non-targeted:** The result is not evidence for the changed behavior. Re-run a targeted check.
- **Not applicable:** State why the category does not apply.

Never call work complete, update acceptance tests as though they passed, or claim a result based on a check that did not exercise the changed behavior.

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

Name the evidence, its scope, and anything that remains unverified. Do not replace evidence with an assumption.
