---
type: task
id: CAREER-APP-03
title: Build the compact applications workspace frame
status: ready
priority: high
team: career
project: career-applications-workspace-redesign
labels:
  - applications
  - layout
  - frontend
estimate: M
assignee: unassigned
depends_on:
  - CAREER-APP-02
blocks:
  - CAREER-APP-04
  - CAREER-APP-05
---

# Build the compact applications workspace frame

## Objective

Replace the current loose page composition with a compact header and a dominant list surface. The route remains `/applications`; this ticket changes composition only.

## Files to update

- `apps/career/app/routes/applications.tsx`
- `apps/career/app/components/career/applications/ApplicationsFilters.tsx`
- `apps/career/app/components/career/applications/types.ts`

Use existing layout tokens and primitives. Do not introduce a new page-level card, dashboard panel, kanban view, bulk-edit control, or root navigation destination.

## Layout contract

1. The header contains the `Applications` title, the total application count, and the single primary `Add application` action.
2. The query rail follows the header with a deliberately small vertical gap.
3. The list begins immediately after the query rail and is the visual focus.
4. Result range and pagination sit at the list boundary as one context group.
5. At the smallest supported desktop width, the title/action/header, query rail, and first list rows remain composed without horizontal scrolling.
6. Below the desktop breakpoint, controls wrap in a stable order: search, filters, sort, active filters, then pagination.

## Implementation steps

1. Replace or reconfigure `SectionIntro` so the count is part of the header hierarchy rather than passive text below the title.
2. Keep `Add application` as the only primary action and link it to `/applications/new`.
3. Remove the large header-to-toolbar gap and avoid compensating with arbitrary negative margins.
4. Let `ApplicationsFilters` own the complete query rail, including active filters and pagination controls, but render the count/range beside the list boundary as defined in CAREER-APP-02.
5. Use a stable grid/flex contract so controls do not resize or push the list when labels change.
6. Ensure empty-state pages do not render a filter rail when there are no applications.
7. Ensure no-results state still has a clear path back to the unfiltered list.

## Acceptance criteria

- The first viewport establishes the title, count, primary action, query rail, and beginning of the list in that order.
- The header and rail have no unexplained empty field between related controls.
- The page has one primary action and no competing dashboard-style summary panel unless CAREER-APP-00 explicitly approved one.
- The layout works at the smallest supported desktop width and a narrow viewport without overlap or horizontal scroll.
- Existing empty and no-results copy remains truthful and actionable.

## Validation

Run the focused route tests plus a browser inspection at the supported desktop and narrow widths. Record viewport dimensions and any deviations in CAREER-APP-05.
