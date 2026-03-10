# VOID Design Alignment And Enforcement

## 1. Project Metadata

| Field | Value |
| --- | --- |
| Change Slug | `void-design-alignment-plan` |
| Merge Date | `2026-03-10` |
| Status | `Completed` |
| Tech Lead | `Design Systems / Frontend Platform` |
| Team | `Frontend Platform` |
| Primary Repo | `hackefeller/hominem` |
| PR(s) | `Delivered across shared style tooling, docs, and repo process updates` |
| Commit Range | `Includes shared animation/style work, lint enforcement, and documentation consolidation` |

## 2. Executive Summary

| Item | Detail |
| --- | --- |
| Problem | The repo needed one enforceable VOID design policy instead of scattered principles and app-specific interpretations. |
| Outcome | The shared design instruction set, stylelint enforcement, breezy animation primitives, and PR checklist now provide the canonical VOID policy and review surface. |
| Business/User Impact | Designers and engineers now have one shared rulebook for VOID compliance, reducing drift and making later app cleanup measurable. |
| Delivery Shape | `Policy + tooling alignment` |

This plan was about defining and enforcing the shared VOID design standard, not about finishing every app migration. The repository now contains the core artifacts that make that policy real: consolidated design instructions, centralized breezy motion utilities, a stylelint config that blocks forbidden patterns, a copy lint path, and PR checklist language that encodes VOID review expectations.

The app layer is not fully cleaned up yet, and that work continues under the separate implementation-focused plan for deep VOID rollout across apps. Because the alignment and enforcement pieces are already present, this policy plan is complete and should not stay open as if it were an app migration backlog.

## 3. Scope

### 3.1 In Scope

| Area | Change |
| --- | --- |
| Shared design standard | Consolidated the VOID design rules into a canonical instruction document |
| Motion policy | Added the approved shared breezy animation utilities in shared styles |
| Enforcement | Added VOID-oriented stylelint rules and connected them into repo linting |
| Review process | Added VOID checklist expectations to the PR template and supporting tooling |

### 3.2 Out of Scope

| Area | Rationale |
| --- | --- |
| Full app-by-app visual cleanup | That belongs to `feat-deep-void-design-system-apps-plan` |
| Declaring every current app screen fully VOID-compliant | The alignment plan defined and enforced policy; it did not finish all migration work itself |

## 4. Baseline and Targets

| Metric / Characteristic | Before | Target | Actual |
| --- | --- | --- | --- |
| Canonical VOID rules | Fragmented docs and evolving norms | One primary repo rule set | `.github/instructions/design.instructions.md` |
| Approved animation primitive | No single repo-level approved motion utility | Shared breezy primitive only | `packages/ui/src/styles/animations.css` |
| CSS enforcement | Weak/no shared denylist for VOID violations | Lint-backed enforcement | `packages/ui/tools/stylelint-config-void.cjs` |
| Review process | No explicit VOID merge checklist | Required review checklist | `.github/pull_request_template.md` |

## 5. Architecture and Design Decisions

| Decision | Options Considered | Why Selected | Tradeoff |
| --- | --- | --- | --- |
| Put canonical guidance in repo instructions | Keep multiple docs, rely on tribal knowledge, or centralize | Makes agent and human workflows converge on the same standard | Requires ongoing maintenance of one high-signal doc |
| Allow one shared breezy animation primitive | Ban all motion, allow many motion variants, or allow one constrained primitive | Preserves design intent while avoiding arbitrary motion sprawl | Some components still need migration off older motion usage |
| Enforce core constraints through stylelint | Manual review only, custom ad hoc scripts, or lint-backed rules | Fast feedback and CI enforcement for forbidden CSS patterns | Not every UI violation is catchable with CSS lint alone |

### 5.1 Final Architecture

VOID policy now lives in shared repo guidance and shared UI style assets. `design.instructions.md` defines the principles and hard rules, `animations.css` provides the sanctioned motion utilities, `stylelint-config-void.cjs` blocks major forbidden CSS constructs, and the PR template carries the review checklist into everyday development.

## 6. Implementation Breakdown

| Workstream | Key Changes | Owner | Status |
| --- | --- | --- | --- |
| Design documentation | Consolidated VOID design instructions into one canonical repo doc | Frontend Platform | `done` |
| Shared style primitives | Added breezy animation utilities and related shared style hooks | Frontend Platform | `done` |
| Lint enforcement | Added VOID-focused stylelint configuration and copy lint support | Frontend Platform | `done` |
| Review workflow | Added VOID checklist language to the pull request template | Frontend Platform | `done` |

### 6.1 File and System Footprint

| Path / System | Change Type | Notes |
| --- | --- | --- |
| `.github/instructions/design.instructions.md` | `retained` | Canonical shared VOID design rules |
| `packages/ui/src/styles/animations.css` | `retained` | Shared breezy animation utilities |
| `packages/ui/tools/stylelint-config-void.cjs` | `retained` | CSS enforcement layer for VOID constraints |
| `packages/ui/tools/void-copy-lint.mjs` | `retained` | Content lint support for cold-copy expectations |
| `.github/pull_request_template.md` | `retained` | PR checklist includes VOID review items |
| `docs/plans/2026-02-10-void-design-alignment-plan.md` | `removed` | Replaced by merged doc |

## 7. Data and Migration Notes

| Topic | Details |
| --- | --- |
| Strategy | Shared design-system alignment only; no data migration |
| Ordering | Define policy, wire shared style utilities, add lint/review process, then rely on app migrations separately |
| Safety Controls | Shared rules and lint checks reduce uncontrolled visual drift |
| Rollback | Revert the affected style/tooling changes if enforcement becomes too restrictive |
| Residual Risk | App-level violations can still exist until the separate app migration plan is finished |

## 8. Validation and Quality Gates

| Layer | What Ran | Result | Evidence |
| --- | --- | --- | --- |
| Repo instruction inspection | Verified consolidated VOID rules exist | `pass` | `.github/instructions/design.instructions.md` |
| Shared style inspection | Verified shared breezy animation classes exist | `pass` | `packages/ui/src/styles/animations.css` |
| Tooling inspection | Verified VOID stylelint and copy-lint tooling exist | `pass` | `packages/ui/tools/stylelint-config-void.cjs`, `packages/ui/tools/void-copy-lint.mjs` |
| Process inspection | Verified PR template includes VOID checklist items | `pass` | `.github/pull_request_template.md` |

### 8.1 Known Gaps

| Gap | Impact | Mitigation |
| --- | --- | --- |
| App code still contains some VOID violations | Medium | Track and finish under the deep app implementation plan rather than keeping this policy plan open |
| Not every design violation is statically lint-detectable | Low | Keep human review checklist in place alongside lint rules |

## 9. Deployment and Operations

| Item | Details |
| --- | --- |
| Deployment Plan | Ships through normal frontend and shared-style deploys |
| Dependencies | Shared UI styles, stylelint, PR review process |
| Monitoring | Watch lint failures, review friction, and app migration progress |
| Incident Response | Relax or scope specific lint rules if they block legitimate patterns unexpectedly |
| Rollback Trigger | Excess false positives or broken shared animation/style behavior |

## 10. Security and Compliance

| Check | Result | Notes |
| --- | --- | --- |
| Auth/AuthZ impact | `ok` | No auth changes |
| Data handling impact | `ok` | Design/tooling only |
| Secrets/config changes | `no` | None introduced here |

## 11. Learnings

| Learning | Action for Future Projects |
| --- | --- |
| Design systems need enforcement artifacts, not just principles | Pair guidance docs with lint rules and review checklists |
| Policy and implementation should be tracked separately when their timelines differ | Keep “alignment” and “app migration” as separate completion records |
| One sanctioned animation primitive is easier to enforce than a long list of allowed exceptions | Keep shared motion APIs intentionally small |

## 12. Follow-ups

| ID | Follow-up | Owner | Priority | Due Date | Status |
| --- | --- | --- | --- | --- | --- |
| `F-001` | Finish app-level VOID cleanup under the remaining deep app implementation plan | `Frontend Platform` | `P1` | `2026-03-31` | `open` |
