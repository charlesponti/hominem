---
name: jinn-sync
description: Use when Linear state has drifted from reality — stale In Progress issues, work completed without updates, or issues missing from the board. Reconciles Linear with what actually happened.
license: MIT
compatibility: Requires jinn CLI and a configured Linear MCP server.
metadata:
  author: jinn
  version: "1.0"
  generatedBy: "1.0.0"
  category: Workflow
  tags: [workflow, sync, linear, reconcile]
---

Reconcile Linear state with the current state of the codebase using Linear MCP.

## Steps

### 1. Collect current Linear state
- Verify Linear MCP is available (check for `linear_*` tools).
- Use `mcp_linear_list_issues` with `state: "In Progress"` to find all currently claimed issues.
- Use `mcp_linear_list_issues` with `state: "Todo"` to find all queued issues in scope.

### 2. Audit each In Progress issue
For every issue currently marked In Progress:
- Use `mcp_linear_get_issue` (+ `includeRelations: true`) to read its description and acceptance criteria.
- Search the codebase for evidence the work is complete (relevant files changed, tests passing, feature present).
- Classify as one of:
  - **Done** — work is complete and verified; update to Done with `mcp_linear_save_issue` + summary comment via `mcp_linear_save_comment`.
  - **Stale** — no apparent work done and no recent activity; add a comment flagging staleness, transition back to `Todo`.
  - **Blocked** — work started but stopped for a known reason; add a blocking comment, transition to `Blocked`.
  - **Genuinely In Progress** — active work is happening; leave as-is.

### 3. Audit Todo queue for orphans
- Identify any `Todo` issues that have no `parentId` but belong to an existing parent's scope.
- Use `mcp_linear_save_issue` to set the correct `parentId` and restore proper hierarchy.

### 4. Identify undocumented work
- Check recent git commits or changed files for work with no corresponding Linear issue.
- For each undocumented change, use `mcp_linear_save_issue` to create a new issue (or sub-issue under the relevant parent) marked **Done**, describing what was delivered.

### 5. Report
- Summarise the transitions made: how many issues moved to Done, Stale, Blocked, or left unchanged.
- List any undocumented changes that were back-filled.
- Call out any issues that need human review before proceeding.

## Guardrails
- Never transition an issue to Done without codebase evidence — only verify, do not assume.
- Always use Linear MCP tools to update state — never manage manually.
- Do not delete or cancel issues during sync; flag them for human review instead.
- Run sync before starting a new `jinn-apply` session to prevent double-claiming work.
