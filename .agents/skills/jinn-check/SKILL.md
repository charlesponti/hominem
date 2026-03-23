---
name: jinn-check
description: Use mid-execution to report current state: what's done, what's in progress, what's blocked, and what happens next. Surfaces blockers and recommends the next action.
license: MIT
compatibility: Requires an active work plan. Use during jinn-do execution.
metadata:
  author: jinn
  version: "1.0"
  generatedBy: "1.0.0"
  category: Workflow
  tags: [workflow, status, check, execution]
when:
  - the user asks for a status update mid-execution
  - a milestone has been reached and work should be assessed before continuing
  - something feels off and the health of current work needs to be assessed
applicability:
  - Use during active task execution to surface the current state
  - Use to identify blockers before they stall progress
termination:
  - Status report delivered with clear recommendation
  - All blockers are named with a recommended resolution
  - Next action is unambiguous
outputs:
  - Status report (on track | at risk | blocked)
---

Answer: *where are we and what do we need to know right now?*

## Steps

### 1. Gather the current state
- Review what has been done, what is in progress, and what remains.
- Check the active Linear project/issues with `mcp_linear_list_issues` filtered to In Progress and Todo.

### 2. Surface blockers
- Are any tasks waiting on something external?
- Use `mcp_linear_get_issue` with `includeRelations: true` to check for `blockedBy` dependencies.

### 3. Assess timeline
- Is delivery still on track given current progress?
- Are any remaining tasks larger than originally estimated?

### 4. Flag risks
- Has anything emerged that could threaten the goal?
- Are there incomplete tasks that have hidden dependencies?

### 5. Deliver the status report

```
## Status: [on track | at risk | blocked]

**Done**
- [completed tasks, with a brief note on what was produced]

**In Progress**
- [tasks actively being worked, with current state]

**Blocked**
- [task]: [what is blocking it] — [recommended resolution]

**Next**
- [next task(s) to start]

**Risks**
- [anything that could affect timeline or quality]

**Recommendation**
[One clear sentence: what should happen next]
```

## Guardrails
- Do not report what you hope is true — report what you can verify.
- Every blocker must have a recommended resolution, not just a description.
- The recommendation must be actionable: one sentence, one owner, one direction.
