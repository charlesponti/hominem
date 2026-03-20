---
name: jinn-explore
description: Use when exploring tradeoffs, risks, or missing context inside an existing Linear project or issue.
license: MIT
compatibility: Requires jinn CLI and a configured Linear MCP server.
metadata:
  author: jinn
  version: "1.0"
  generatedBy: "1.0.0"
  category: Workflow
  tags: [workflow, explore, linear, investigation]
when:
  - user wants to investigate tradeoffs or risks before implementing
  - there is missing context or open decisions in a Linear issue or project
  - user needs to explore options without committing to implementation
applicability:
  - Use when exploring tradeoffs, risks, or dependencies in existing Linear work
  - Use before implementation when context or direction is unclear
termination:
  - Options, risks, and open decisions documented in Linear
  - Recommendation or decision written back to the Linear issue or project
outputs:
  - Updated Linear issue or project description with decisions
  - Risk and tradeoff analysis
---

Explore context, tradeoffs, and risks inside a Linear issue or project using Linear MCP.

## Steps

### 1. Verify and orient
- Confirm Linear MCP is available (check for `linear_*` tools).
- Use `mcp_linear_get_issue` (+ `includeRelations: true`) on the target issue or project to read its current description, acceptance criteria, and relations.
- Read all sub-issues with `mcp_linear_list_issues` (filtered by `parentId`) to understand the full scope.

### 2. Map the unknowns
Identify every open question in the issue:
- **Decision gaps** — questions that must be answered before implementation can start.
- **Dependency unknowns** — unclear whether an upstream change or API is ready.
- **Scope ambiguity** — the issue description doesn't fully define what "done" looks like.
- **Risk areas** — portions of the design with a high chance of failure or rework.

### 3. Investigate
For each unknown identified in step 2:
- Search the codebase for relevant context (existing patterns, related code, prior attempts).
- Read related Linear issues with `mcp_linear_get_issue` to understand decisions already made.
- Reason about tradeoffs — name at least two options and the consequences of each.

### 4. Write findings back to Linear
- Use `mcp_linear_save_issue` to update the issue or project description with:
  - Resolved decisions and their rationale.
  - Outstanding decisions requiring human input (each as a named open question).
  - Any missing or incomplete acceptance criteria.
- Use `mcp_linear_save_comment` to summarise the exploration and confirm it is complete.

### 5. Report
- State which questions were resolved and which remain open.
- Give a clear recommendation: is the issue ready for `jinn-apply`, or does it need a decision first?

## Guardrails
- Always use Linear MCP tools — never manage context externally.
- Do not start implementation during explore — this skill produces decisions, not code.
- Never mark a question resolved without concrete rationale written into the issue.
- Keep recommendations grounded in both codebase evidence and Linear context.
