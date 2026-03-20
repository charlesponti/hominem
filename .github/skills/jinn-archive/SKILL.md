---
name: jinn-archive
description: Use when closing or cleaning up completed Linear projects, issues, and follow-up work.
license: MIT
compatibility: Requires jinn CLI and a configured Linear MCP server.
metadata:
  author: jinn
  version: "1.0"
  generatedBy: "1.0.0"
  category: Workflow
  tags: [workflow, archive, linear, done]
---

Close completed Linear work using Linear MCP.

## Steps

### 1. Verify and orient
- Confirm Linear MCP is available (check for `linear_*` tools).
- Use `mcp_linear_list_issues` with the project or parent issue ID to list all issues.
- Count: how many are Done? How many remain Todo, In Progress, or Blocked?

### 2. Resolve or defer remaining issues
For each issue that is not Done:
- **In Progress** — determine if it can be finished now or must be deferred. If deferring, run `jinn-sync` to reconcile its status first.
- **Blocked** — run `jinn-unblock` to diagnose. If it cannot be resolved, defer to a follow-up issue.
- **Todo** — assess whether it belongs to this scope. If small and in-scope, complete it. If large or out-of-scope, create a new issue under a different parent or a new follow-up project and record its ID.

### 3. Mark the project complete
- Confirm all sub-issues are either Done, cancelled, or deferred to a clearly identified follow-up.
- Use `mcp_linear_save_issue` to update the parent issue status to **Done**.
- If a Linear project owns this work, update the project to mark it complete.

### 4. Write a completion summary
- Use `mcp_linear_save_comment` on the parent issue to post a completion note:
  - What was delivered.
  - What was deferred (link to follow-up issues).
  - Lessons or risks to carry forward.

### 5. Report
- Confirm the parent issue (and project if applicable) is closed.
- List any follow-up issues created with their URLs.

## Guardrails
- Always use Linear MCP tools to transition state — never manage manually.
- Surface all incomplete items before closing — do not silently skip unresolved work.
- Deferred work must have a named home (a follow-up issue or project) — do not delete or cancel it.
- Every closed project must have a completion comment; closure without a summary is not complete.
