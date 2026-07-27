# V. Evidence

Completion is conditional on evidence of the exact changed behavior in its real execution environment. Compilation, formatting, type checks, builds, and broad test suites are supporting evidence only; they do not prove a visible interaction, a layout, an external side effect, or a deployment result.

- **Pure computation or contract** — Targeted test that asserts the changed input/output contract.
- **User-visible or interactive behavior** — Target device/browser evidence for each changed state and transition.
- **Constrained composition** — Verification at the smallest supported viewport, device, or container.
- **External write or deployment** — Observation of the resulting external state and target identity.
- **Framework/library capability** — Minimal working proof of the exact capability before feature work depends on it.

- A stateful interaction is not verified by its idle render. Evidence covers entry, active/focused/loading state, cancellation or failure when applicable, and return or recovery.
- A failed, skipped, ambiguous, stale-build, or non-targeted validation leaves the change unverified. It is a blocker, not a warning to explain away.
- Before composing controls in a bounded surface, prove the complete composition fits. If the approved behavior does not fit in the chosen primitive, report the constraint and stop; do not silently change product behavior.
- Automation must have a deterministic selection and observation path for app-owned controls and outcomes. If it does not, resolve the testability gap or report it before completion.
- A completion report names the evidence, its scope, and any behavior that remains unverified. It never substitutes an assumed result for evidence.

