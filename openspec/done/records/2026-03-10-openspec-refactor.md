# OpenSpec Refactor

## 1. Project Metadata

| Field | Value |
| --- | --- |
| Change Slug | `openspec-refactor` |
| Merge Date | `2026-03-10` |
| Status | `Completed` |
| Tech Lead | `Platform` |
| Team | `Platform` |
| Primary Repo | `hackefeller/hominem` |
| Source Artifacts | Retired after merge from `openspec/inbox/openspec-refactor/{proposal,design,tasks}.md`; archived delta retained at `openspec/archive/2026-03-10-openspec-refactor/specs/openspec-workflow/spec.md` |
| Evidence Commits | `e0546bfb` |

## 2. Executive Summary

| Item | Detail |
| --- | --- |
| Problem | The repo’s OpenSpec layout split active work, canonical truth, and historical summaries across `changes`, `specs`, and `merged`, which made the workflow harder to understand and maintain. |
| Outcome | OpenSpec now uses `openspec/inbox`, `openspec/done`, and `openspec/archive` as the primary layout, with compatibility shims preserved for legacy CLI behavior. |
| Business/User Impact | Humans and agents have a clearer lifecycle model for spec work without losing compatibility with existing tooling. |
| Delivery Shape | `Incremental` |

This change reorganized the repository’s OpenSpec filesystem layout around a clearer lifecycle model. Active work now lives under `inbox`, canonical completed artifacts live under `done`, and trace-only history lives under `archive`.

The implementation kept legacy compatibility intact by preserving shim paths for `openspec/changes`, `openspec/specs`, and `openspec/merged`, then updated the live repo guidance and automation-facing instructions to point at the new structure first.

## 3. Scope

### 3.1 In Scope

| Area | Change |
| --- | --- |
| Directory layout | Introduced `openspec/inbox`, `openspec/done`, and `openspec/archive` as the primary workflow layout. |
| Canonical truth | Moved canonical specs to `openspec/done/specs` and merged records to `openspec/done/records`. |
| Compatibility | Recreated legacy path entry points as compatibility shims so the current CLI and older helpers could continue to resolve expected locations. |
| Workflow docs | Updated active-change guardrails, next-step docs, prompts, and skills to reference the new layout. |

### 3.2 Out of Scope

| Area | Rationale |
| --- | --- |
| Upstream OpenSpec CLI changes | The change intentionally adapted the repo layout without modifying the external CLI itself. |
| Historical doc normalization | Older archived materials were allowed to keep legacy path references as long as live guidance reflected the new model. |
| Spec schema redesign | Artifact semantics stayed the same; only layout and workflow guidance changed. |

## 4. Baseline and Targets

| Metric / Characteristic | Before | Target | Actual |
| --- | --- | --- | --- |
| Open change location clarity | Active work lived under `openspec/changes` with completed history split across multiple homes | Use a clearer lifecycle model centered on `inbox`, `done`, and `archive` | Open changes now live under `openspec/inbox` |
| Canonical completed spec location | Canonical truth lived under `openspec/specs` | Publish completed truth under `openspec/done/specs` | Canonical specs now live under `openspec/done/specs` |
| Completion history location | Human-readable merged docs lived under `openspec/merged` | Publish completion history under `openspec/done/records` | Completion records now live under `openspec/done/records` |
| CLI compatibility | Risk of breakage during repo layout cleanup | Preserve legacy entry points with shims | Legacy paths remain available as compatibility shims |

## 5. Architecture and Design Decisions

| Decision | Options Considered | Why Selected | Tradeoff |
| --- | --- | --- | --- |
| Use `inbox`, `done`, and `archive` as the primary top-level structure | Keep legacy naming, or introduce a new lifecycle-oriented layout | The new names map more directly to how humans think about active, completed, and historical work | Repo docs and helpers needed coordinated updates |
| Keep `done` split into `specs` and `records` | Merge all completed artifacts into one folder, or retain separate homes | This preserves a clean distinction between canonical truth and narrative completion history | Users must learn one additional nested structure under `done` |
| Preserve legacy paths as compatibility shims | Break old tooling immediately, or maintain filesystem shims during transition | This avoids blocking the external CLI and older prompts while the repo adopts the new model | The repo now carries some filesystem indirection |

### 5.1 Final Architecture

The repository now treats `openspec/inbox` as the home for all non-archived changes, `openspec/done/specs` as the canonical completed spec tree, `openspec/done/records` as the completed change history, and `openspec/archive` as raw historical traceability. Legacy path names remain available only as compatibility shims for tooling that still expects the old layout.

## 6. Implementation Breakdown

| Workstream | Key Changes | Owner | Status |
| --- | --- | --- | --- |
| Layout migration | Created the new top-level directories and moved open, completed, and archived content into their new homes | Platform | `done` |
| Compatibility shims | Recreated legacy `changes`, `specs`, and `merged` paths as compatibility shims | Platform | `done` |
| Workflow updates | Updated active-change docs, next steps, prompts, and skills to prefer the new layout | Platform | `done` |
| Validation | Verified open-change and canonical-spec discovery workflows after the migration | Platform | `done` |

### 6.1 File and System Footprint

| Path / System | Change Type | Notes |
| --- | --- | --- |
| `openspec/inbox` | `added` | New primary home for open changes |
| `openspec/done/specs` | `added` | New canonical home for completed specs |
| `openspec/done/records` | `added` | New home for completion records |
| `openspec/archive` | `added` | New raw historical archive location |
| `openspec/ACTIVE_CHANGE.md` | `updated` | Active change guardrail now points at inbox artifacts |
| `openspec/NEXT_STEPS.md` | `updated` | Workflow guidance updated for the new layout |
| `.codex/skills/*` and repo instructions | `updated` | Human and agent guidance now prefers the new structure |

## 7. Data and Migration Notes

| Topic | Details |
| --- | --- |
| Strategy | Move real content first, then reintroduce legacy path names as compatibility shims |
| Ordering | Create target directories, move open changes, move completed artifacts, recreate shims, then update docs |
| Safety Controls | Preserved legacy path access during the transition and limited scope to repo layout and guidance |
| Rollback | Restore the legacy layout or re-point the compatibility paths if tooling regressions appear |
| Residual Risk | External tooling that bypasses the expected shim paths may still require future follow-up |

## 8. Validation and Quality Gates

| Layer | What Ran | Result | Evidence |
| --- | --- | --- | --- |
| Artifact completion | Reviewed `proposal.md`, `design.md`, and `tasks.md` for the active change | `pass` | All three artifacts existed and the task checklist was fully completed |
| Workflow validation | Verified the change preserved open-change and canonical-spec discovery expectations | `pass` | Restored the legacy `openspec/changes` shim and confirmed `openspec list --json` discovered the remaining inbox changes |
| Archive close-out | Synced the delta spec into `openspec/done/specs`, created the merged record, and archived the raw change folder | `pass` | Final archive and record generation completed on `2026-03-10` |

### 8.1 Known Gaps

| Gap | Impact | Mitigation |
| --- | --- | --- |
| `openspec/ACTIVE_CHANGE.md` requires a deliberate next activation after this archive | Low | Leave the file in a neutral state until the next change is explicitly activated |

## 9. Deployment and Operations

| Item | Details |
| --- | --- |
| Deployment Plan | No deploy required; this was a repository workflow and filesystem organization change |
| Dependencies | External `openspec` CLI behavior, repo instructions, and agent skills that reference OpenSpec paths |
| Monitoring | Watch future archive/apply flows for any remaining legacy path assumptions |
| Incident Response | Restore shim targets or update workflow docs if a consumer breaks on the new layout |
| Rollback Trigger | Users or automation can no longer list, apply, or archive changes through the expected repo workflows |

## 10. Security and Compliance

| Check | Result | Notes |
| --- | --- | --- |
| Auth/AuthZ impact | `none` | No authentication or authorization behavior changed |
| Data handling impact | `none` | No application data flows or persistence layers were modified |
| Secrets/config changes | `no` | No secrets or environment configuration changed |

## 11. Learnings

| Learning | Action for Future Projects |
| --- | --- |
| Repo workflow changes need both filesystem moves and instruction updates to stick | Treat docs, prompts, and skills as part of the implementation footprint |
| Compatibility shims are a practical bridge when upstream tooling cannot be changed immediately | Prefer additive transitions for workflow infrastructure changes |
| Archiving should verify both task completion and canonical spec sync | Keep close-out workflows explicit about sync and record-generation steps |

## 12. Follow-ups

| ID | Follow-up | Owner | Priority | Due Date | Status |
| --- | --- | --- | --- | --- | --- |
| `F-001` | Choose and activate the next inbox change before starting new implementation work | `Platform` | `P2` | `2026-03-24` | `open` |
