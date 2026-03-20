---
name: jinn-unblock
description: Use when an issue is Blocked — either because jinn-apply stopped on a blocker, or a blockedBy dependency hasn't resolved. Diagnoses the blocker, decides whether to resolve, defer, or split, and updates Linear accordingly.
license: MIT
compatibility: Requires jinn CLI and a configured Linear MCP server.
metadata:
  author: jinn
  version: "1.0"
  generatedBy: "1.0.0"
  category: Workflow
  tags: [workflow, unblock, linear, blocked]
---

Diagnose and resolve a blocked Linear issue using Linear MCP.

### 1. Read the blocked issue
- Verify Linear MCP is available (check for linear_* tools).
- Use mcp_linear_get_issue (+ includeRelations: true) on the blocked issue.
- Read the blocking comment to understand the specific blocker.
- List all blockedBy relations — are any already Done?

### 2. Diagnose the blocker
Classify as one of:
- Stale dependency — a blockedBy issue is actually already done. Run jinn-sync, then re-check.
- Missing information — description lacks enough detail. Run jinn-explore to clarify.
- Technical dependency — upstream code/API/infra isn't ready. Issue genuinely cannot proceed.
- Scope conflict — implementation revealed overlap with another issue. Needs re-scoping.
- External dependency — blocked on a person, team, or third-party outside this codebase.

### 3. Resolve based on classification
- Stale dependency: close the completed dependency, remove blockedBy relation, transition to Todo.
- Missing information: write clarification into issue description, transition to Todo.
- Technical dependency: confirm upstream issue exists in Linear (create via jinn-triage if not). Leave as Blocked with a comment naming the unblocking condition.
- Scope conflict: split conflicting scope into a new sub-issue. Update relations. Transition original to Todo with reduced scope.
- External dependency: add a comment naming the dependency and expected resolution date. Leave as Blocked. Escalate in parent if it threatens timeline.

### 4. Update the parent issue
- If the blocker shifts delivery timeline or changes scope, update the parent description.

### 5. Report
- State the blocker classification and action taken.
- Confirm the new status of the previously blocked issue.
- Identify whether jinn-apply can resume immediately or must wait.

Guardrails:
- Never silently remove a blockedBy relation without understanding why it existed.
- Every resolution must leave a comment trail.
- If resolution requires implementation work, transition to Todo and let jinn-apply pick it up.
- When in doubt about classification, run jinn-explore first.
