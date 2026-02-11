# VOID Design Alignment & Enforcement Plan (v1)

Date: 2026-02-10
Owner: Design Systems / Frontend Platform
Scope: All apps under `apps/**`; shared assets in `package/styles` and component libraries.

## Objectives
- Achieve strict adherence to VOID design system (docs/design.system.md, .github/instructions/design.instructions.md).
- Centralize styling and animation in `package/styles`; eliminate app-level bespoke styles.
- Introduce a single approved "breezy wave" animation primitive and block any other app-defined motion.
- Embed Japanese minimalism (Kanso, Ma, Shibui, Wabi-sabi) as enforceable constraints across UI, copy, and interaction.

## Success Criteria
- 0 app-level `@keyframes`, `transition`, or `animation` definitions outside `package/styles` (lint enforced).
- 100% component styles reference tokens/utilities from `package/styles` (no raw hex/rgba except allowed palette).
- Storybook (or equivalent) showcases all primitives with/without breezy animation and passes visual regression.
- PR checklist updated and used in ≥90% of relevant merges in a 4-week window.
- Accessibility: WCAG AA contrast, keyboard focus visible, prefers-reduced-motion honored for animations.

## Principles (constraints to enforce)
- Monochrome palette only; borders at 10% opacity; no shadows/gradients.
- Monospace stack only; uppercase headings with tight tracking; generous line-height for Ma.
- Layout asymmetry allowed; spacing scale anchored by `--spacing-ma-xl: 16rem` for sectional separation.
- Motion: only the shared "breezy wave" primitive; amplitude low, duration 200–400ms, sine-like ease; must respect `prefers-reduced-motion`.
- Interaction: crosshair cursor default; focus states visible; state changes instantaneous outside the approved animation contexts.
- Copy: cold, command-like tone; avoid friendly phrases.

## Workstreams
1) **Token & Style Consolidation**
   - Audit `package/styles` tokens (color, spacing, typography, border, cursor, texture, animation).
   - Add missing tokens and the approved breezy animation keyframes + utility classes.
   - Publish usage docs and code examples for consuming tokens/utilities.
   - Narrow palette to core tokens; remove/alias secondary/accent to avoid drift.

2) **Primitive Components**
   - Define VOID-compliant primitives (button, input, field wrapper, table, card, overlay/ASCII texture, badge, status chip).
   - Ensure all primitives source styles exclusively from `package/styles` and expose composition-friendly APIs.
   - Deprecate legacy primitives; provide migration notes.

3) **App Migration**
   - Inventory current views against primitives; create a migration tracker per app.
   - Replace ad-hoc styles with primitives/utilities; remove local `@keyframes`/transitions.
   - Add breezy animation only where prescribed (e.g., hover/entry micro-motion) via shared classes.

4) **Tooling & Enforcement**
   - Oxlint + stylelint rules: forbid `transition`/`animation` definitions and `@keyframes` outside `package/styles`; enforce color whitelist and monospace-only font-family; ban box-shadows/gradients/backdrop-filter/border-radius (outside tokens).
   - CI hook: include the lint checks in `bun run lint` and `bun run check`.
   - Codemods (optional): swap raw palette values to tokens; flag inline styles.

5) **Review Process & Documentation**
   - Update PR template with VOID checklist (tokens only, shared animation only, crosshair cursor, spacing per Ma, ASCII texture <0.20, WCAG AA, cold copy).
   - Produce a short reviewer guide and "void score" rubric; require screenshot set (default/focus/error/empty) and keyboard-only walkthrough.
   - Expand design system docs with: breezy spec, palette discipline, Ma spacing examples, component defaults, cold-copy rules.
   - Add content lint script to flag friendly language and exclamation points.
   - Publish a VOID Quickstart page for onboarding with do/don't examples and review checklist.

6) **Quality Bar**
   - Visual regression: snapshot primitives with and without animation; fail on unintended drift (colors, spacing, motion timing).
   - Accessibility sweeps: keyboard nav, focus visibility, contrast, prefers-reduced-motion respects animation opt-out.

## Milestones & Timeline (proposed)
- **Week 1 (2026-02-10 to 2026-02-17):** Token/style audit; add breezy animation; publish usage examples; draft lint rules.
- **Week 2:** Implement lint/stylelint rules in CI; build/verify primitives; update PR template and reviewer rubric.
- **Week 3–4:** App migration waves; run codemods; remove legacy animations/styles; add visual regression coverage.
- **Week 5:** Accessibility and motion conformance sweep; finalize docs; measure adoption (lint passes, checklist usage, void scores).

## Risks & Mitigations
- **Hidden inline styles:** Use codemods and lint autofix where safe; manual review for remaining cases.
- **Animation overuse:** Limit exposed animation utilities to one or two classes; document approved contexts only.
- **Regression fatigue:** Lean on visual regression snapshots and a small set of golden screens per app.
- **Performance overhead of textures:** Keep ASCII texture opacity ≤0.20 and ensure opt-in; test on low-end devices.

## Deliverables
- Updated `package/styles` with tokens + breezy animation utilities and docs.
- VOID primitive component set with stories and tests.
- Lint/stylelint configs enforcing palette, typography, no app-level animations, no shadows/gradients.
- Revised PR template and reviewer rubric (void score checklist).
- Migration tracker per app with completion % and blockers.
- Visual regression and accessibility report post-migration.

## Open Decisions
- Which specific views get the breezy animation (e.g., hover on primary CTAs vs. list item focus)?
- Do we supply a secondary, slower wave variant for large surfaces, or keep a single primitive?
- Preferred visual regression tool (existing Storybook Chromatic vs. local playwright snapshots).
- Radix stance: keep Radix for a11y robustness; enforce VOID tokens/animations through shared wrappers and document any Radix-specific styling hooks.
 - Whether to codify ASCII texture default opacity as 0.12 token and require approval above that.

## Next Actions
- Approve milestones and owners.
- Finalize oxlint/stylelint wiring in CI; run `bun install` to capture stylelint in lockfile.
- Decide on animation exposure (one vs. two variants) and document contexts.
- Begin replacing Radix UI usage with base VOID primitives where feasible; log exceptions (e.g., complex menus) with rationale.

## Progress Log (2026-02-10)
- Added shared breezy-wave animation primitives in `package/styles` and wired import into globals.
- Replaced app-level animation classes with shared utilities in finance, notes, rocco, and UI components.
- Added stylelint VOID config and hooked root `lint` to run it; updated PR template with VOID checklist.
- Confirmed oxlint remains the JS/TS linter of record (no ESLint); stylelint covers CSS.
- Radix left as-is for now; no wrapper migrations in apps—VOID enforcement will rely on shared tokens/animations applied via styling.
- Extended stylelint denylist (shadow/gradient/backdrop-filter/radius) and added copy lint script; added VOID Quickstart doc.
