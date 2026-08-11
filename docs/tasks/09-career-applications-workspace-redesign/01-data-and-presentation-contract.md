---
type: task
id: CAREER-APP-01
title: Define application card data and missing-value presentation
status: ready
priority: high
team: career
project: career-applications-workspace-redesign
labels:
  - data-contract
  - applications
  - frontend
estimate: M
assignee: unassigned
depends_on:
  - CAREER-APP-00
blocks:
  - CAREER-APP-02
  - CAREER-APP-04
---

# Define application card data and missing-value presentation

## Objective

Make the application list truthful and predictable before changing its layout. Confirm which fields are available from the existing card loader, normalize only presentation values that already exist, and define deliberate rendering for null status, source, date, stage, and location values.

## Files to inspect and update

- `apps/career/app/lib/career/queries/job-applications.ts`
- `apps/career/app/lib/career/queries/job-applications.server.ts`
- `apps/career/app/routes/applications.tsx`
- `apps/career/app/lib/utils/applicationUtils.ts`
- `apps/career/app/types/career.ts`
- `apps/career/app/test/factories/applications.ts`

Do not edit generated database types. Do not add a database migration in this ticket.

## Implementation steps

1. Inventory the fields in `JobApplicationCard` and map each field to its intended list position:
   - identity: `title`, `company`;
   - status: `status`;
   - source: `source`;
   - recency: `appliedAt`;
   - stage: `currentStage` and/or `stageCount`;
   - secondary context: `location` only if approved by the final row schema.
2. Verify the runtime values returned by `getApplicationCards`. Record whether status/source are null because of stored data, mapping, or fixture setup.
3. Confirm that status labels use the canonical values from `apps/career/app/types/career.ts`; do not create new enum members or map one status to another.
4. Normalize source display text at the presentation boundary. Preserve the stored/filter value for matching and URL state. The displayed label must be stable regardless of input casing.
5. Define exact copy for missing values. A missing field must render intentional text or be omitted according to the approved row schema; it must never create dangling punctuation, an empty metadata column, or a blank area that implies a value exists.
6. Keep `NO_STATUS_FILTER` and `NO_SOURCE_FILTER` as internal filter values only. Do not expose their sentinel strings to the UI.
7. Add fixtures covering populated, null-only, mixed, and sparse cards.

## Required behavior

- Status, source, and applied date remain independent fields in the card model.
- A null status never renders as an empty badge slot.
- A null source never renders as `·`, `undefined`, or a raw sentinel.
- A null applied date has a defined sort position and display behavior.
- Existing application detail navigation remains unchanged.

## Acceptance criteria

- The loader-to-list field map is documented in code through types and tests, not tribal knowledge.
- Tests cover at least one card with every optional list field populated and one card with all optional fields null.
- Tests prove source display normalization does not change filter matching.
- Tests prove canonical status labels are used without adding enum values.
- A reviewer can determine the null-state behavior from the implementation without guessing.

## Validation

Run:

```bash
pnpm --filter @hominem/career... test -- apps/career/app/lib/career/queries apps/career/app/routes/applications.test.tsx
pnpm --filter @hominem/career... typecheck
pnpm --filter @hominem/career... format:check
```
