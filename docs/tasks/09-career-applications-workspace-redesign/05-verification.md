---
type: task
id: CAREER-APP-05
title: Verify applications workspace states and responsive behavior
status: ready
priority: high
team: career
project: career-applications-workspace-redesign
labels:
  - applications
  - quality
  - browser-validation
estimate: M
assignee: unassigned
depends_on:
  - CAREER-APP-02
  - CAREER-APP-03
  - CAREER-APP-04
---

# Verify applications workspace states and responsive behavior

## Objective

Produce evidence that the redesign works as an interactive workspace, not only that it compiles. Every changed state in the proposal must be exercised against deterministic fixtures or the running Career app.

## Automated coverage

Update `apps/career/app/routes/applications.test.tsx` and the relevant query/component tests to cover:

1. default populated list;
2. title/company search match and no-match;
3. status filter selection, including the approved missing-status behavior;
4. source filter selection, including the approved missing-source behavior;
5. sort direction toggle or approved alternate sort field behavior;
6. active-filter chip removal;
7. clear-all behavior;
8. pagination to the next page and clamping an out-of-range page;
9. no applications;
10. no matching applications;
11. one-option and zero-useful-option filter menus;
12. null status/source/date/stage presentation;
13. long title/company rendering;
14. keyboard focus and link navigation semantics.

Assert user-visible labels and resulting URL parameters. Do not rely only on snapshots or class names.

## Browser validation matrix

At the running Career app `/applications`, inspect and record evidence for:

- desktop default state at the observed 1027px width;
- the smallest supported desktop width;
- narrow/mobile-width responsive layout;
- populated status/source data;
- null-only status/source data;
- mixed populated/null data;
- search active;
- status active;
- source active;
- multiple active filters;
- open status menu;
- open source menu;
- open sort control or toggled sort state;
- no-results state;
- first page, middle page if available, and last page;
- pointer hover on a row;
- keyboard focus on the search, controls, pagination, and a row link.

For each state verify:

- no overlap or horizontal scrolling;
- the query rail remains understandable;
- result count describes the visible result set;
- pagination changes only the page;
- filter changes reset the page;
- missing values are intentional and truthful;
- row activation opens the correct application.

## Required evidence

Record in the implementation PR or work item:

- commands run and their outcomes;
- viewport dimensions used;
- screenshots or browser evidence for default, active-filter, menu-open, no-results, and narrow states;
- any state that could not be exercised because the local data is unavailable;
- remaining risks or test gaps.

A typecheck, lint run, or build is supporting evidence only. It does not replace browser interaction evidence.

## Validation commands

```bash
pnpm --filter @hominem/career... test
pnpm --filter @hominem/career... lint
pnpm --filter @hominem/career... typecheck
pnpm --filter @hominem/career... format:check
```

Do not start the Career dev server as part of this ticket. The repository instructions require the user to start long-running services. If the server is not running, report the exact browser checks that remain unproven and ask the user to start it.

## Acceptance criteria

- All automated cases above pass.
- All browser states above are inspected at the target widths, or explicitly reported as unproven with the blocking prerequisite.
- No changed interaction is accepted solely from a compile or unit-test result.
- The final evidence identifies any unresolved product decision, unavailable data state, or browser limitation.
