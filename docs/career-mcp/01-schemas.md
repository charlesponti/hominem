---
type: task
id: CAREER-MCP-01
title: Shared Zod schemas for career create/update/delete
status: ready
priority: high
team: api
project: career-mcp
labels:
  - schemas
  - career
estimate: S
assignee: unassigned
depends_on:
  - CAREER-MCP-00
blocks:
  - CAREER-MCP-02
  - CAREER-MCP-03
  - CAREER-MCP-04
---

# Shared Zod schemas for career create/update/delete

## Objective

Define the input contracts for the missing create/update/delete operations in `career.schema.ts`. These are the single source of truth consumed by both the MCP tools and the RPC routes.

## Files to update

- `services/api/src/schemas/career.schema.ts`

## Schemas to add

1. `careerEngagementCreateSchema` — `company` and `title` required (trimmed, min 1); the remaining fields mirror `careerEngagementUpdateDataSchema` (location, address, url, startDate, endDate, isCurrent, salaryLow/salaryHigh as `number().int().nullable()`, currency, description, contactName, contactPhone, source, kind, reasonForLeaving).
2. `careerApplicationCreateSchema` — `company` and `title` required; `location`, `source`, `appliedAt`, `status` (`careerApplicationStatusSchema`), `jobPostingUrl`, `salaryExpectation` (`number().int().nullable()`), `notes` all nullable/optional.
3. `careerApplicationUpdateSchema` — `{ id: uuid, data: careerApplicationCreateSchema.partial() }`.
4. `careerApplicationDeleteSchema` — `{ id: uuid }`.
5. `careerEducationCreateSchema` — `school` required; `degree`, `fieldOfStudy`, `startDate`, `endDate`, `activities`, `notes` nullable/optional.
6. `careerEducationUpdateSchema` — `{ id: uuid, data: careerEducationCreateSchema.partial() }`.
7. `careerEducationDeleteSchema` — `{ id: uuid }`.

## Acceptance criteria

- Create schemas require the same minimum fields the web forms enforce (`work.new.tsx` requires company + title; `applications.new.tsx` requires position + company).
- Salary fields are integers in cents, matching the existing update schema.
- Update schemas use the `{ id, data }` shape already established by the engagement/project update schemas.

## Validation

`pnpm --filter @hominem/api typecheck` once schemas are imported by the service and adapters.
