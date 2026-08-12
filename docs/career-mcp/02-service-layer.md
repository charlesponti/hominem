---
type: task
id: CAREER-MCP-02
title: Career service functions for create/update/delete
status: ready
priority: high
team: api
project: career-mcp
labels:
  - service
  - career
estimate: M
assignee: unassigned
depends_on:
  - CAREER-MCP-00
  - CAREER-MCP-01
blocks:
  - CAREER-MCP-03
  - CAREER-MCP-04
---

# Career service functions for create/update/delete

## Objective

Add the missing `career.service.ts` functions so the MCP and RPC adapters delegate to one implementation, and propagate the repository boolean returns through the existing remove functions.

## Files to update

- `services/api/src/application/career.service.ts`

## New functions

1. `createCareerEngagement(ownerUserId, input)` — `CareerRepository.createEngagement`, return `toEngagementDto`.
2. `createCareerApplication(ownerUserId, input)` — `CareerRepository.createApplication`, return a DTO compatible with the `careerApplicationsSchema` shape (map `appliedAt`, `currentStage: null`, `stageCount: 0`, `hasOffer: false`).
3. `updateCareerApplication(ownerUserId, id, data)` — ownership-checked via `CareerRepository.getApplicationWithRelations` (or an explicit owner check); return the mapped application DTO or `null` for cross-owner IDs.
4. `removeCareerApplication(ownerUserId, id)` — return `CareerRepository.deleteApplication(...)` (boolean).
5. `createCareerEducation(ownerUserId, input)` — `CareerRepository.createEducation`, return the mapped education DTO (same shape as `listCareerEducation`).
6. `updateCareerEducation(ownerUserId, id, data)` — return the mapped DTO or `null` when `updateEducation` returns null.
7. `removeCareerEducation(ownerUserId, id)` — return `CareerRepository.deleteEducation(...)` (boolean).

## Fixes

- `removeCareerSkill`, `removeCareerTestimonial`, `removeCareerCertification` — return the repository boolean instead of discarding it.

## Acceptance criteria

- Every new function scopes by `ownerUserId`; cross-owner updates/creates never leak another user's rows.
- Create functions return the shared DTO shapes used by the existing list/detail schemas so `callTool` re-parsing succeeds.
- The service remains the only place with query logic; adapters stay thin.

## Validation

`pnpm --filter @hominem/api typecheck` and the MCP/RPC tests from CAREER-MCP-05.
