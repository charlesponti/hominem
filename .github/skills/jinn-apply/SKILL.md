---
name: jinn-apply
description: Use when executing implementation work from Linear issues and sub-issues.
license: MIT
compatibility: Requires jinn CLI and a configured Linear MCP server.
metadata:
  author: jinn
  version: "1.0"
  generatedBy: "1.0.0"
  category: Workflow
  tags: [workflow, apply, linear, execute]
---

Implement work from Linear using Linear MCP. Work on exactly one issue at a time. Every state change must be reflected back into the issue immediately.

## Single-Issue Execution Loop

Repeat this loop for each issue until the selected scope is complete or blocked.

### 0. Orient (first issue only)
- Verify Linear MCP is available (check for `linear_*` tools).
- Identify the target scope: a project ID, parent issue ID, or single issue ID provided by the user.
- Use `mcp_linear_list_issues` (filtered to scope + `state: "Todo"`) to confirm the full queue before starting.
- Read the first issue with `mcp_linear_get_issue` (+ `includeRelations: true`) to confirm no unresolved `blockedBy` dependencies. If there are, surface the blocker and stop.

### 1. Select the next issue
Use this priority order:

**a. Relations-first (explicit ordering)**
- Call `mcp_linear_get_issue` with `includeRelations: true` on the most recently completed issue.
- If it has `blocks` relations, those issues are now unblocked — pick the highest-priority one.

**b. Sibling sub-issues (implicit ordering)**
- If the completed issue has a `parentId`, call `mcp_linear_list_issues` filtered by that `parentId` and `state: "Todo"`.
- Pick the highest-priority unstarted sibling.

**c. Project backlog fallback**
- Call `mcp_linear_list_issues` with the target project and `state: "Todo"`, ordered by priority.
- Pick the top unblocked issue.

After identifying the candidate, call `mcp_linear_get_issue` (with `includeRelations: true`) to confirm no unresolved `blockedBy` relations before claiming it.

### 2. Claim the issue
- Use `mcp_linear_get_issue_status` / `mcp_linear_list_issue_statuses` to resolve the "In Progress" status ID for this team.
- Use `mcp_linear_save_issue` to move the issue to **In Progress** before writing a single line of code.
- Do not start implementation until the status is confirmed updated.

### 3. Implement and verify
- Implement only what the issue describes — nothing more.
- Run all relevant checks (type-check, lint, tests) before declaring work done.
- If a blocker surfaces mid-implementation: stop, add a comment explaining the blocker, transition the issue to **Blocked**, and do not proceed.

### 4. Update the issue on completion
- Use `mcp_linear_save_comment` to leave a concise summary: what changed and why, files touched, any follow-up issues needed.
- Use `mcp_linear_save_issue` to move the issue to **Done** (resolve the correct status ID first).

### 5. Move to the next issue
- Only after the current issue is **Done** in Linear, return to step 1.
- Never hold two issues In Progress simultaneously.

## Guardrails
- Always use Linear MCP tools to read and write Linear data — never manage state manually.
- One issue In Progress at a time. Finish before starting the next.
- Status must reflect reality: claim In Progress before coding, mark Done only after verification passes.
