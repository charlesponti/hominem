---
name: jinn-propose
description: Use when turning a change request into a Linear project with seeded issues and sub-issues.
license: MIT
compatibility: Requires jinn CLI and a configured Linear MCP server.
metadata:
  author: jinn
  version: "1.0"
  generatedBy: "1.0.0"
  category: Workflow
  tags: [workflow, propose, linear, planning]
---

Create a Linear-backed change proposal using Linear MCP. The output is a single parent issue that owns the entire proposal, with one sub-issue per phase.

## Steps

### 1. Verify and orient
- Confirm Linear MCP is available (check for `linear_*` tools).
- Use `mcp_linear_list_teams` to identify the correct team.
- Check for an existing matching issue with `mcp_linear_list_issues` — update it instead of duplicating.

### 2. Clarify the change
- Identify the goal, scope, and constraints of the requested change.
- Break the work into sequential phases (e.g., schema, API, UI, tests). Each phase must be independently shippable or testable.
- Surface open decisions or unknowns that must be resolved before or during implementation.

### 3. Create the parent issue
- Use `mcp_linear_save_issue` to create a single **parent issue** for the entire change:
  - **Title**: concise name for the overall change.
  - **Description**: problem statement, proposed approach, success criteria, and any open decisions.
  - Status: `Todo`.
- Record the returned issue ID — all sub-issues will reference it as `parentId`.

### 4. Create one sub-issue per phase
For each phase identified in step 2, use `mcp_linear_save_issue` to create a sub-issue:
- Set `parentId` to the parent issue ID from step 3.
- **Title**: `[Phase N] <concise phase name>` (e.g., `[Phase 1] Database schema migration`).
- **Description**: what this phase delivers, its acceptance criteria, and any `blockedBy` relations to earlier phases.
- Set `blockedBy` relations between phases so Linear enforces the correct execution order (phase 2 is blocked by phase 1, etc.).
- Status: `Todo`.

### 5. Report
- Share the parent issue URL and a numbered list of sub-issues with their titles.
- Call out any open decisions or risks that should be resolved before `jinn-apply` begins.

## Guardrails
- Always use Linear MCP tools to interact with Linear — never manage state manually.
- The parent issue is the single source of truth for the proposal — do not create a separate local planning document.
- Sub-issues must have `parentId` set — orphan issues are not acceptable.
- Use `blockedBy` relations between phases to model sequencing, not just ordering by title.
- Update an existing matching parent issue instead of duplicating it.

Guardrails:
- Always use Linear MCP tools to interact with Linear — never manage state manually.
- Linear is the source of truth.
- Do not create local planning artifacts as the primary record.
- Update an existing matching Linear project instead of duplicating it.
