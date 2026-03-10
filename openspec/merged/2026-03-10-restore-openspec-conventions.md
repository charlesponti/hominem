# Restore OpenSpec Conventions

## 1. Project Metadata

| Field | Value |
| --- | --- |
| Change Slug | `restore-openspec-conventions` |
| Merge Date | `2026-03-10` |
| Status | `Completed` |
| Tech Lead | `Platform` |
| Team | `Platform` |
| Primary Repo | `hackefeller/hominem` |
| Source Artifacts | Retired after merge from `openspec/archive/2026-03-10-restore-openspec-conventions/{proposal,design,tasks}.md`; archived delta retained at `openspec/archive/2026-03-10-restore-openspec-conventions/specs/openspec-workflow/spec.md` |
| Evidence Commits | `82936198` |

## 2. Executive Summary

| Item | Detail |
| --- | --- |
| Problem | The repo-specific `inbox` and `done` layout made OpenSpec harder to reason about because the visible filesystem no longer matched standard OpenSpec conventions. |
| Outcome | The repo now uses `openspec/changes`, `openspec/specs`, and `openspec/merged` as real directories again, while keeping `openspec/archive` as the raw audit history. |
| Business/User Impact | Humans and agents can follow the default OpenSpec model again without chasing repo-specific indirection. |
| Delivery Shape | `Incremental` |

This change reversed the temporary OpenSpec layout experiment and restored the standard working model in the repository. Open changes live under `openspec/changes`, canonical completed specs live under `openspec/specs`, and human-readable completion records live under `openspec/merged`.

The implementation also updated live guidance so the filesystem structure, instructions, and tool expectations point at the same locations again. That reduces onboarding friction and lowers the chance of agents editing the wrong tree.

## 3. Scope

### 3.1 In Scope

| Area | Change |
| --- | --- |
| Open change layout | Restored `openspec/changes` as the real home for active work. |
| Canonical specs | Moved completed spec truth back to `openspec/specs`. |
| Completion history | Restored `openspec/merged` as the real merged-record location. |
| Workflow guidance | Updated active-change guidance and live docs to reference the restored standard layout. |
| Archive model | Preserved `openspec/archive` as the trace-only archive for raw completed change folders. |

### 3.2 Out of Scope

| Area | Rationale |
| --- | --- |
| Upstream OpenSpec CLI behavior | The change only restored repo structure and guidance. |
| Historical archive rewrites beyond live path fixes | Older raw archive content was left intact unless needed for active guidance. |
| Capability redesign | The change focused on workflow structure, not new product behavior. |

## 4. Baseline and Targets

| Metric / Characteristic | Before | Target | Actual |
| --- | --- | --- | --- |
| Open change discovery | Active work lived under `openspec/inbox` with legacy `changes` acting as a shim | Make `openspec/changes` authoritative again | `openspec/changes` is the live open-change tree |
| Canonical spec location | Canonical specs lived under `openspec/done/specs` | Restore `openspec/specs` as the canonical location | `openspec/specs` is the canonical completed spec tree |
| Completion record location | Merged records lived under `openspec/done/records` | Restore `openspec/merged` as the narrative history location | `openspec/merged` is the live completion-record tree |
| Workflow clarity | Docs and structure pointed at different mental models | Align filesystem, docs, and agent instructions | Live guidance now references the standard OpenSpec model consistently |

## 5. Architecture and Design Decisions

| Decision | Options Considered | Why Selected | Tradeoff |
| --- | --- | --- | --- |
| Make `changes/specs/merged` authoritative again | Keep `inbox/done` and update docs only | The confusion came from the filesystem model, not only the wording | Required another coordinated path migration |
| Keep `openspec/archive` as a repo-specific extension | Move raw archive content into `merged` or remove archive entirely | Raw archived folders and merged records serve different purposes | The repo keeps one extra top-level OpenSpec directory |
| Move real content instead of layering more shims | Add reverse symlinks or additional compatibility indirection | A simple directory layout is easier for people and tooling to trust | Required careful updates to all live references |

### 5.1 Final Architecture

The repository now treats `openspec/changes`, `openspec/specs`, and `openspec/merged` as the standard, authoritative OpenSpec directories. `openspec/archive` remains available as an audit-oriented raw archive, but it is no longer presented as part of the active workflow model.

## 6. Implementation Breakdown

| Workstream | Key Changes | Owner | Status |
| --- | --- | --- | --- |
| Path restoration | Moved open changes, canonical specs, and merged records back to the standard OpenSpec directories | Platform | `done` |
| Layout cleanup | Removed the temporary `inbox` and `done` indirection from the live repository structure | Platform | `done` |
| Guidance updates | Updated active-change docs and workflow references to point at `changes`, `specs`, and `merged` | Platform | `done` |
| Verification | Confirmed the restored structure works with `openspec list --json` and that the archived prior record still resolves | Platform | `done` |

### 6.1 File and System Footprint

| Path / System | Change Type | Notes |
| --- | --- | --- |
| `openspec/changes` | `updated` | Restored as the real directory for active changes |
| `openspec/specs` | `updated` | Restored as the canonical completed spec tree |
| `openspec/merged` | `updated` | Restored as the real completion-record location |
| `openspec/archive` | `updated` | Preserved as raw archived history |
| `openspec/ACTIVE_CHANGE.md` | `updated` | Repointed during implementation, then reset to `none` at archive time |
| Live workflow docs and skill guidance | `updated` | Removed references to the temporary `inbox` and `done` model |

## 7. Data and Migration Notes

| Topic | Details |
| --- | --- |
| Strategy | Move canonical content back to the standard OpenSpec paths, then update live instructions to match |
| Ordering | Repoint active change, restore canonical directories, update docs, verify, then archive the raw change folder |
| Safety Controls | Kept archive history intact and verified the workflow commands against the restored layout |
| Rollback | Reintroduce the `inbox` and `done` layout if a downstream tool depends on it unexpectedly |
| Residual Risk | Any local scripts or docs not covered by the path sweep may still contain stale references |

## 8. Validation and Quality Gates

| Layer | What Ran | Result | Evidence |
| --- | --- | --- | --- |
| Artifact completion | `openspec status --change "restore-openspec-conventions" --json` | `pass` | Reported `schemaName: "spec-driven"` and all artifacts as `done` |
| Task completion | Reviewed `openspec/changes/restore-openspec-conventions/tasks.md` before archive | `pass` | All checklist items were marked complete |
| Spec sync | Compared `openspec/changes/restore-openspec-conventions/specs/openspec-workflow/spec.md` against `openspec/specs/openspec-workflow/spec.md` | `pass` | No diff was produced, so canonical specs were already in sync |
| Close-out | Archived the raw change folder, removed superseded planning docs, and created the merged record | `pass` | Archive created at `openspec/archive/2026-03-10-restore-openspec-conventions` and merged record added on `2026-03-10` |

### 8.1 Known Gaps

| Gap | Impact | Mitigation |
| --- | --- | --- |
| Local deploy/config work remains outside this archived change | Low | Activate or propose a separate change before implementation work continues |

## 9. Deployment and Operations

| Item | Details |
| --- | --- |
| Deployment Plan | No application deploy was required; this was a repository workflow and documentation change |
| Dependencies | OpenSpec CLI behavior, repo docs, and agent skills that consume path conventions |
| Monitoring | Watch future apply/archive workflows for any stale `inbox` or `done` references |
| Incident Response | Restore the prior layout or patch remaining references if a workflow breaks |
| Rollback Trigger | `openspec` workflows or repo instructions begin resolving the wrong directories again |

## 10. Security and Compliance

| Check | Result | Notes |
| --- | --- | --- |
| Auth/AuthZ impact | `none` | No authentication or authorization behavior changed |
| Data handling impact | `none` | No application data flows or persistence behavior changed |
| Secrets/config changes | `no` | No secrets or environment configuration changed |

## 11. Learnings

| Learning | Action for Future Projects |
| --- | --- |
| Workflow conventions should stay close to upstream defaults unless there is a strong operational reason to diverge | Prefer standard OpenSpec layouts for long-lived repos |
| Filesystem layout changes need matching doc and skill updates to actually reduce confusion | Treat agent instructions as first-class implementation scope |
| Archive close-out is a good checkpoint for verifying spec sync and active-change hygiene | Keep archive workflows opinionated about validation and cleanup |

## 12. Follow-ups

| ID | Follow-up | Owner | Priority | Due Date | Status |
| --- | --- | --- | --- | --- | --- |
| `F-001` | Activate or propose a separate OpenSpec change before making new implementation edits in the repo | `Platform` | `P2` | `2026-03-17` | `open` |
