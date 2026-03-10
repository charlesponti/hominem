# <Project Title>

## 1. Project Metadata

| Field | Value |
| --- | --- |
| Change Slug | `<change-slug>` |
| Merge Date | `YYYY-MM-DD` |
| Status | `Completed` |
| Tech Lead | `<owner-or-team>` |
| Team | `<team-name>` |
| Primary Repo | `<org/repo>` |
| Source Artifacts | `<path/to/proposal.md>`, `<path/to/design.md>`, `<path/to/tasks.md>` |
| Evidence Commits | `<sha1>`, `<sha2>` |

## 2. Executive Summary

| Item | Detail |
| --- | --- |
| Problem | <What problem the change addressed> |
| Outcome | <What was delivered> |
| Business/User Impact | <Why this matters> |
| Delivery Shape | `<Phased|Incremental|Big-bang|Other>` |

<1-2 concise paragraphs summarizing intent, execution, and completion context.>

## 3. Scope

### 3.1 In Scope

| Area | Change |
| --- | --- |
| <Area> | <Implemented behavior/change> |
| <Area> | <Implemented behavior/change> |

### 3.2 Out of Scope

| Area | Rationale |
| --- | --- |
| <Area> | <Why excluded> |
| <Area> | <Why excluded> |

## 4. Baseline and Targets

| Metric / Characteristic | Before | Target | Actual |
| --- | --- | --- | --- |
| <Metric> | <Baseline> | <Target> | <Actual> |
| <Metric> | <Baseline> | <Target> | <Actual> |

## 5. Architecture and Design Decisions

| Decision | Options Considered | Why Selected | Tradeoff |
| --- | --- | --- | --- |
| <Decision> | <Option A, B, C> | <Selection reason> | <Cost/limitation> |
| <Decision> | <Option A, B, C> | <Selection reason> | <Cost/limitation> |

### 5.1 Final Architecture

<Concise description of final architecture and boundaries.>

## 6. Implementation Breakdown

| Workstream | Key Changes | Owner | Status |
| --- | --- | --- | --- |
| <Workstream> | <Key implementation changes> | <Owner> | `done` |
| <Workstream> | <Key implementation changes> | <Owner> | `done` |

### 6.1 File and System Footprint

| Path / System | Change Type | Notes |
| --- | --- | --- |
| `<path/to/file>` | `added|updated|removed` | <What changed> |
| `<path/to/file>` | `added|updated|removed` | <What changed> |

## 7. Data and Migration Notes

| Topic | Details |
| --- | --- |
| Strategy | <Migration strategy> |
| Ordering | <Execution order> |
| Safety Controls | <Guards and constraints> |
| Rollback | <Rollback strategy> |
| Residual Risk | <Remaining risk> |

## 8. Validation and Quality Gates

| Layer | What Ran | Result | Evidence |
| --- | --- | --- | --- |
| <Validation layer> | <Command/test/check> | `pass|partial|fail` | <Commit/PR/run/log reference> |
| <Validation layer> | <Command/test/check> | `pass|partial|fail` | <Commit/PR/run/log reference> |

### 8.1 Known Gaps

| Gap | Impact | Mitigation |
| --- | --- | --- |
| <Gap> | <Low/Medium/High + effect> | <Mitigation/follow-up> |
| <Gap> | <Low/Medium/High + effect> | <Mitigation/follow-up> |

## 9. Deployment and Operations

| Item | Details |
| --- | --- |
| Deployment Plan | <How rollout is/was performed> |
| Dependencies | <External/internal deps> |
| Monitoring | <Signals and dashboards> |
| Incident Response | <Owner/runbook summary> |
| Rollback Trigger | <Criteria for rollback> |

## 10. Security and Compliance

| Check | Result | Notes |
| --- | --- | --- |
| Auth/AuthZ impact | `none|ok|changed` | <Details> |
| Data handling impact | `none|ok|changed` | <Details> |
| Secrets/config changes | `no|yes` | <Details> |

## 11. Learnings

| Learning | Action for Future Projects |
| --- | --- |
| <Learning> | <Action> |
| <Learning> | <Action> |

## 12. Follow-ups

| ID | Follow-up | Owner | Priority | Due Date | Status |
| --- | --- | --- | --- | --- | --- |
| `F-001` | <Specific next action> | `<Owner>` | `P1|P2|P3` | `YYYY-MM-DD` | `open` |
| `F-002` | <Specific next action> | `<Owner>` | `P1|P2|P3` | `YYYY-MM-DD` | `open` |
