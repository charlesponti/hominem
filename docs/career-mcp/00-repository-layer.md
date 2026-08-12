---
type: task
id: CAREER-MCP-00
title: Repository layer boolean delete returns and education methods
status: ready
priority: high
team: api
project: career-mcp
labels:
  - db
  - career
estimate: S
assignee: unassigned
depends_on: []
blocks:
  - CAREER-MCP-01
  - CAREER-MCP-02
  - CAREER-MCP-03
  - CAREER-MCP-04
---

# Repository layer boolean delete returns and education methods

## Objective

Give every career delete path a boolean result so MCP delete tools can report `{ removed: boolean }`, and add ownership-scoped education update/delete methods that do not exist today.

## Files to update

- `packages/db/src/services/career/career.repository.ts`
- `packages/db/src/services/career/skill.repository.ts`
- `packages/db/src/services/career/testimonial.repository.ts`
- `packages/db/src/services/career/certification.repository.ts`

## Implementation steps

- [x] Change the return type of `CareerRepository.delete*` functions to `Promise<boolean>`.
- [ ] Add `CareerRepository.updateEducation(handle, ownerUserId, id, data)` — `updateTable('app.careerEducation')` scoped by `id` and `ownerUserid`, `.returningAll().executeTakeFirst()`, null-safe return of `CareerEducationRecord | null`.
- [ ] Add `CareerRepository.deleteEducation(handle, ownerUserId, id)` — `deleteFrom('app.careerEducation')` scoped by `id` and `ownerUserid`, `.returning('id').executeTakeFirst()`, return `Promise<boolean>`.
- [ ] `SkillRepository.remove`, `TestimonialRepository.remove`, `CertificationRepository.remove` — change return type to `Promise<boolean>` using the same `.returning('id').executeTakeFirst()` pattern.
- [ ] Rebuild: `pnpm --filter @hominem/db build` so `apps/career` resolves fresh declaration output.

## Acceptance criteria

- All four delete methods return `true` only when the delete touched the caller's own row.
- `updateEducation` returns the updated row for the owner and `null` for cross-owner IDs.
- `apps/career` typechecks against the rebuilt output (clear stale `.cache/tsconfig.tsbuildinfo` if it trips).

## Validation

1. `pnpm --filter @hominem/db build`
2. `pnpm --filter @hominem/db... exec tsc --noEmit`
3. `pnpm --filter @hominem/career exec tsc --noEmit`
