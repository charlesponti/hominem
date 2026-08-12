---
type: task
id: CAREER-MCP-05
title: Write failing MCP and RPC integration tests (TDD red)
status: in_progress
priority: high
team: api
project: career-mcp
labels:
  - tests
  - mcp
  - rpc
  - career
estimate: L
assignee: unassigned
depends_on:
  - CAREER-MCP-00
  - CAREER-MCP-01
  - CAREER-MCP-02
  - CAREER-MCP-03
  - CAREER-MCP-04
blocks:
  - CAREER-MCP-06
---

# Write failing MCP and RPC integration tests (TDD red)

## Objective

Write the behavior tests first against the real `app-test` Postgres database. These must fail until CAREER-MCP-00 through CAREER-MCP-04 land. Follow the patterns in `career-engagements-projects.test.ts` and `career.test.ts` — fixed test users seeded in `beforeAll`, direct `db`/`pool` seeding, and `callTool`/`app.request` assertions.

## Files to update

- `services/api/src/mcp/tools/career-engagements-projects.test.ts` (extend) or new `services/api/src/mcp/tools/career-crud.test.ts`
- `services/api/src/rpc/routes/career.test.ts` (extend)

## MCP tests

Per entity (engagement, application, education, skill, project, testimonial, certification):

1. **Create → list round-trip:** call the create tool, assert the returned entity, then assert it appears in the corresponding existing list tool (`career_engagements`, `career_applications`, `career_education`, `career_skills`, `career_projects`, `career_testimonials`, `career_certifications`).
2. **Update:** mutate a field, assert the updated entity.
3. **Delete:** call the delete tool, assert `{ removed: true }`, then assert the row is gone from the DB.
4. **Cross-owner isolation:** with `otherUserId`, update returns null, delete returns `{ removed: false }`, and create never writes for the owner.

Plus:
5. **Notes:** `career_application_note_add` → list via `career_application_detail` → `career_application_note_remove`.
6. **Files:** `career_application_file_add` → list → `career_application_file_remove`.
7. **Social links:** `career_social_links_save` then read via `career_social_links`.

## RPC tests

Per new route:

1. Happy-path create/update/delete round-trip asserting status code and response body.
2. Cross-owner update/delete returns 404.

## Acceptance criteria

- Tests run against the real test DB with `DATABASE_URL` pointing at `app-test` (see `packages/db/AGENTS.md`).
- Each test fails for the right reason before implementation: tool/route missing, or service returning the wrong shape.
- Assert exact raw timestamp strings in the DB's format where dates are involved.

## Validation

`pnpm exec vitest run src/mcp src/rpc/routes/career.test.ts` from `services/api` — expected red before implementation, green after CAREER-MCP-02/03/04.
