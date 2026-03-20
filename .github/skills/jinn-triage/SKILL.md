---
name: jinn-triage
description: Use when a bug report, ad-hoc request, or unplanned issue arrives and needs to be assessed, sized, and placed into the correct position in the Linear hierarchy before work begins.
license: MIT
compatibility: Requires jinn CLI and a configured Linear MCP server.
metadata:
  author: jinn
  version: "1.0"
  generatedBy: "1.0.0"
  category: Workflow
  tags: [workflow, triage, linear, intake]
---

Intake and place new issues into the correct position in the Linear hierarchy using Linear MCP.

## Steps

### 1. Understand the incoming item
- Collect the full description of the bug, request, or idea.
- Identify: What is broken or missing? Who is affected? Is there a deadline or severity?
- Classify as one of:
  - **Bug** — something working before is now broken.
  - **Gap** — a missing capability in an already-defined feature.
  - **New scope** — something outside all existing parent issues.
  - **Spike** — research or investigation needed before a solution can be defined.

### 2. Find the right parent
- Use `mcp_linear_list_issues` to search existing parent issues by keyword or project.
- If a matching parent issue exists: the new item is a sub-issue — record the `parentId`.
- If no matching parent exists and the item is new scope: create a parent issue first (follow `jinn-propose` steps 3–4 for the new scope), then add this item as its first sub-issue.

### 3. Assess priority and phase placement
- If attaching to an existing parent, review its existing sub-issues with `mcp_linear_list_issues` filtered by `parentId`.
- Determine whether this item should:
  - **Block** an in-progress or upcoming sub-issue (`blockedBy` relation).
  - **Be inserted before** an upcoming phase (use `mcp_linear_save_issue` with `blockedBy` / `blocks` to splice it in).
  - **Queue at the end** of the sub-issue list.

### 4. Create the issue
- Use `mcp_linear_save_issue` to create the issue with:
  - `parentId` set to the identified parent.
  - `priority` set appropriately (bugs at least `high`).
  - `blockedBy` / `blocks` relations if the item must be sequenced around existing phases.
  - A clear description: **what** is wrong or needed, **acceptance criteria**, and reproduction steps for bugs.
- Status: `Todo`.

### 5. Report
- Share the new issue URL and its position in the parent hierarchy.
- Note any phase ordering changes made (issues re-sequenced to accommodate this item).
- Flag if the item revealed scope that should update the parent issue description.

## Guardrails
- Always use Linear MCP tools — never create offline issue lists.
- Do not start implementation during triage; triage ends when the issue is in the correct position in Linear.
- Bugs that affect an In Progress phase must be evaluated for whether they block the current `jinn-apply` session.
- If the item is ambiguous, run `jinn-explore` before completing triage.
