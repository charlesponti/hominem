**Ticket:** [HUMAN-...](https://linear.app/ponti/issue/HUMAN-...)

## TODOs

### VOID Checklist (required)
- [ ] Uses `package/styles` tokens/utilities only (no raw hex/rgba, shadows, gradients)
- [ ] Animation classes come from `package/styles` (no app-level `@keyframes`/`transition`)
- [ ] Monospace stack + crosshair cursor retained
- [ ] Spacing honors Ma (negative space) and borders at 10% opacity; no rounded corners
- [ ] ASCII texture opacity ≤ 0.20 where used
- [ ] Cold, command-like copy; WCAG AA contrast; keyboard focus visible; respects `prefers-reduced-motion`

### CI/CD Workflow Checklist (required when `.github/` files are changed)
- [ ] Workflow YAML validated with actionlint (run `actionlint .github/workflows/*.yml` locally or see the `validate-workflows` CI job)
- [ ] All `DATABASE_URL` values in test environments include `?sslmode=disable`
- [ ] New secrets referenced in workflows are documented and provisioned in the repository settings
- [ ] Reusable workflows/actions are used where possible instead of copy-pasting steps
- [ ] No hard-coded versions — pin to a specific SHA or tag for third-party actions

### Before Merging
<!---
E.g:
- [x] Set SOME_KEY in beta and production
- [ ] Create the DB for XYZ service
-->

### After Merging
<!---
E.g:
- [ ] Remove migration job
-->
