---
type: task
id: CAREER-MCP-04
title: Add career RPC routes
status: ready
priority: medium
team: api
project: career-mcp
labels:
  - rpc
  - career
estimate: S
assignee: unassigned
depends_on:
  - CAREER-MCP-01
  - CAREER-MCP-02
blocks:
  - CAREER-MCP-05
---

# Add career RPC routes

## Objective

Expose the new career operations over HTTP through `rpc/routes/career.ts`, delegating to the same shared service functions as the MCP tools.

## Files to update

- `services/api/src/rpc/routes/career.ts`

## Routes to add

All use `zValidator('json', ...)` and `authMiddleware`, and must be thin one-liners delegating to the service.

1. `POST /career/engagements/create` — `careerEngagementCreateSchema`, respond `c.json(created, 201)`.
2. `POST /career/applications/create` — `careerApplicationCreateSchema`, respond `c.json(created, 201)`.
3. `POST /career/applications/update` — `careerApplicationUpdateSchema`; `NotFoundError` when the service returns null.
4. `POST /career/applications/delete` — `careerApplicationDeleteSchema`; `NotFoundError` when `removed` is false.
5. `POST /career/education/create` — `careerEducationCreateSchema`, respond `c.json(created, 201)`.
6. `POST /career/education/update` — `careerEducationUpdateSchema`; `NotFoundError` when null.
7. `POST /career/education/delete` — `careerEducationDeleteSchema`; `NotFoundError` when `removed` is false.

## Acceptance criteria

- Routes contain no query logic — only `zValidator`, service delegation, and error mapping.
- Cross-owner operations return 404 via `NotFoundError`, matching the existing engagement/project/skill delete routes.
- The RPC contract is a superset; no existing route or client behavior changes.

## Validation

`pnpm --filter @hominem/api typecheck` and the RPC tests from CAREER-MCP-05.
