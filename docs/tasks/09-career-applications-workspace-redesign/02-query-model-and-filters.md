---
type: task
id: CAREER-APP-02
title: Rebuild application query state and filter controls
status: ready
priority: high
team: career
project: career-applications-workspace-redesign
labels:
  - applications
  - filters
  - state-management
estimate: M
assignee: unassigned
depends_on:
  - CAREER-APP-00
  - CAREER-APP-01
blocks:
  - CAREER-APP-03
  - CAREER-APP-05
---

# Rebuild application query state and filter controls

## Objective

Make search, status, source, sort, active filters, result count, and pagination read as one query system while preserving the existing URL-driven behavior.

## Files to update

- `apps/career/app/routes/applications.tsx`
- `apps/career/app/components/career/applications/ApplicationsFilters.tsx`
- `apps/career/app/components/career/applications/types.ts`
- `apps/career/app/lib/career/queries/job-applications.ts`
- `apps/career/app/routes/applications.test.tsx`

## URL contract

Preserve these existing parameters unless the approved sort decision explicitly changes them:

- `query`: free-text search over title and company, case-insensitive;
- `status`: canonical status value or the internal missing-status filter value;
- `source`: stored source value or the internal missing-source filter value;
- `sort`: `desc` for newest first and `asc` for oldest first;
- `page`: 1-based page number.

Every filter or sort change must delete `page`. Pagination changes must not delete the other parameters. Clearing filters must remove only `query`, `status`, and `source`; clearing sort is a separate action unless the product decision says otherwise.

## Implementation steps

1. Replace the current mixed select/ghost-button treatment with one shared trigger grammar for status, source, and sort. Use existing `@ponti-studios/ui` primitives where they support the required states.
2. Cap the desktop search width so it does not consume the entire rail. Keep it full-width on narrow layouts.
3. Keep the default rail quiet: render active-filter chips only for non-empty query/filter state.
4. Place result count and pagination together at the list boundary. Do not show the same range/count in a detached toolbar row.
5. Make active-filter removal update the URL, reset to page 1, and leave unrelated query state intact.
6. Define and implement zero, one, and many option behavior from CAREER-APP-00. Do not render a filter with an empty menu that has no useful choice.
7. Add accessible names and deterministic selectors for search, status, source, sort, clear-all, previous-page, and next-page controls.
8. Keep filtering, sorting, and pagination pure in `job-applications.ts`; add or update unit tests there instead of embedding query logic in JSX.

## Required behavior

- Search matches title or company and trims only for matching; URL state remains inspectable.
- Status/source filters preserve the distinction between a real value and a missing value.
- Sort direction is visibly and textually unambiguous.
- Any filter change resets to page 1.
- A page request outside the valid range is clamped by the existing pagination helper.
- The list never shows a pager without the count context it controls.

## Acceptance criteria

- Default, active-filter, one-result, zero-result, and multi-page rails are each represented in tests.
- URL parameters round-trip through render and interaction without losing unrelated state.
- Active-filter removal and clear-all both reset pagination.
- Search, filters, sort, count, and pagination are one aligned control rail at desktop width and a deliberate wrapped layout on narrow width.
- No raw sentinel value, empty select option, or ambiguous arrow-only sort state is visible to users.

## Validation

```bash
pnpm --filter @hominem/career... test -- apps/career/app/lib/career/queries/job-applications.test.ts apps/career/app/routes/applications.test.tsx
pnpm --filter @hominem/career... typecheck
pnpm --filter @hominem/career... format:check
```
