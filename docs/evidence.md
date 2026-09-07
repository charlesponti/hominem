# Evidence

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

## Applying this standard

The minimum-evidence table per change type, interactive-behavior and
constrained-layout validation rules, failure-handling categories, and the
completion report template are operationalized in the `hominem-evidence`
skill (`.agents/skills/hominem-evidence/`) — every agent should run that
checklist before reporting a change complete. This document is the standard
those steps implement; update it first if the standard itself changes, then
keep the skill in sync.
