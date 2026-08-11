---
type: task
id: CAREER-APP-00
title: Approve applications workspace information model
status: blocked
priority: urgent
team: career
project: career-applications-workspace-redesign
labels:
  - product-decision
  - applications
estimate: S
assignee: unassigned
depends_on: []
blocks:
  - CAREER-APP-01
  - CAREER-APP-02
  - CAREER-APP-03
  - CAREER-APP-04
  - CAREER-APP-05
---

# Approve applications workspace information model

## Objective

Resolve the three product decisions explicitly marked open in the proposal before any UI implementation begins. This ticket is complete only when the decisions are recorded in this document and reflected in the downstream ticket assumptions.

## Decisions required

### 1. Status filter when status data is missing or sparse

Choose exactly one behavior for the Status control when the loaded cards contain only null statuses or only one useful status value:

- `hidden`: do not render the Status control when there are no meaningful status values.
- `disabled`: render the control disabled and show a short explanation that status data is unavailable.
- `missing-value-filter`: render `No status` as a purposeful filter option.
- `cleanup-affordance`: render a control that links to an approved data-cleanup workflow. This requires a separate route or action specification; do not select it without defining that surface.

The decision must define behavior for both zero meaningful values and one meaningful value.

### 2. Sort scope

Choose exactly one:

- `date-direction-only`: retain the current applied-date sort and expose only newest/oldest direction.
- `alternate-fields`: add alternate sort fields. If selected, specify the allowed fields, default field, direction labels, URL parameter format, null-date ordering, and whether the selection persists in the URL.

Do not add alternate fields because the UI has room for them.

### 3. Pipeline summary

Choose exactly one:

- `none`: do not add a summary in this redesign.
- `compact-breakdown`: add a compact count by canonical status.
- `uncategorized-count`: add only a count/link for records with missing status.

If a summary is selected, specify its exact placement, fields, labels, and click behavior. It must not become a dashboard panel or introduce a second application view.

## Required output

Update this document with:

- one selected value for each decision;
- the exact user-facing labels for selected controls or summary values;
- the approved behavior for zero, one, and many option values;
- the person/date approving the choices.

Then update the `Assumptions` section of each downstream ticket if the decision changes its instructions.

## Acceptance criteria

- No downstream ticket contains an unresolved product choice.
- The selected status behavior covers null-only, one-value, and many-value datasets.
- The selected sort behavior defines URL state and null-date ordering.
- The summary decision explicitly says whether the summary exists and what it does.
- The decision is reviewed by the product owner before CAREER-APP-01 starts.

## Out of scope

- Editing application records.
- Adding status values to `apps/career/app/types/career.ts`.
- Changing route ownership or navigation.
