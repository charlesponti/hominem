# <Project / Change Title>

## 1. Project Metadata

| Field | Value |
| --- | --- |
| Change Slug | `<change-slug>` |
| Merge Date | `YYYY-MM-DD` |
| Status | `Completed` |
| Tech Lead | `<name>` |
| Team | `<team>` |
| Primary Repo | `<repo>` |
| PR(s) | `<links>` |
| Commit Range | `<from..to or key SHAs>` |

## 2. Executive Summary

| Item | Detail |
| --- | --- |
| Problem | `<what was broken/slow/risky>` |
| Outcome | `<what is now true>` |
| Business/User Impact | `<why this mattered>` |
| Delivery Shape | `<big-bang / phased / hybrid>` |

Write 2-4 short paragraphs describing context, intent, and shipped outcome.

## 3. Scope

### 3.1 In Scope

| Area | Change |
| --- | --- |
| `<system>` | `<what changed>` |
| `<system>` | `<what changed>` |

### 3.2 Out of Scope

| Area | Rationale |
| --- | --- |
| `<system/feature>` | `<why excluded>` |

## 4. Baseline and Targets

| Metric / Characteristic | Before | Target | Actual |
| --- | --- | --- | --- |
| `<example: CI time>` | `<value>` | `<value>` | `<value>` |
| `<example: typecheck memory>` | `<value>` | `<value>` | `<value>` |

## 5. Architecture and Design Decisions

| Decision | Options Considered | Why Selected | Tradeoff |
| --- | --- | --- | --- |
| `<decision>` | `<a, b, c>` | `<reason>` | `<cost>` |
| `<decision>` | `<a, b, c>` | `<reason>` | `<cost>` |

### 5.1 Final Architecture

Describe final architecture in concise prose with explicit boundaries and responsibilities.

## 6. Implementation Breakdown

| Workstream | Key Changes | Owner | Status |
| --- | --- | --- | --- |
| `<stream>` | `<summary>` | `<name>` | `done` |
| `<stream>` | `<summary>` | `<name>` | `done` |

### 6.1 File and System Footprint

| Path / System | Change Type | Notes |
| --- | --- | --- |
| `<path>` | `added/updated/removed` | `<note>` |
| `<path>` | `added/updated/removed` | `<note>` |

## 7. Data and Migration Notes

| Topic | Details |
| --- | --- |
| Strategy | `<expand/backfill/contract or equivalent>` |
| Ordering | `<sequence and dependencies>` |
| Safety Controls | `<locks, idempotency, retries>` |
| Rollback | `<what is reversible and how>` |
| Residual Risk | `<remaining risk>` |

## 8. Validation and Quality Gates

| Layer | What Ran | Result | Evidence |
| --- | --- | --- | --- |
| Local | `<commands>` | `pass/fail` | `<link/note>` |
| CI | `<workflow/jobs>` | `pass/fail` | `<run links>` |
| Smoke | `<critical flows>` | `pass/fail` | `<note>` |

### 8.1 Known Gaps

| Gap | Impact | Mitigation |
| --- | --- | --- |
| `<gap>` | `<impact>` | `<mitigation>` |

## 9. Deployment and Operations

| Item | Details |
| --- | --- |
| Deployment Plan | `<order of deploy steps>` |
| Dependencies | `<external systems/services>` |
| Monitoring | `<dashboards/alerts/log queries>` |
| Incident Response | `<runbook links and owners>` |
| Rollback Trigger | `<explicit go/no-go and rollback criteria>` |

## 10. Security and Compliance

| Check | Result | Notes |
| --- | --- | --- |
| Auth/AuthZ impact | `ok/needs follow-up` | `<note>` |
| Data handling impact | `ok/needs follow-up` | `<note>` |
| Secrets/config changes | `yes/no` | `<note>` |

## 11. Learnings

| Learning | Action for Future Projects |
| --- | --- |
| `<lesson>` | `<institutionalize this>` |
| `<lesson>` | `<institutionalize this>` |

## 12. Follow-ups

| ID | Follow-up | Owner | Priority | Due Date | Status |
| --- | --- | --- | --- | --- | --- |
| `F-001` | `<item>` | `<name/team>` | `P0/P1/P2` | `YYYY-MM-DD` | `open/in-progress/done` |
| `F-002` | `<item>` | `<name/team>` | `P0/P1/P2` | `YYYY-MM-DD` | `open/in-progress/done` |

