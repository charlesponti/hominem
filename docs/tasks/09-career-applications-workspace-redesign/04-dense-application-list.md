---
type: task
id: CAREER-APP-04
title: Rebuild application rows as a dense scanning list
status: ready
priority: high
team: career
project: career-applications-workspace-redesign
labels:
  - applications
  - information-design
  - frontend
estimate: M
assignee: unassigned
depends_on:
  - CAREER-APP-01
  - CAREER-APP-03
blocks:
  - CAREER-APP-05
---

# Rebuild application rows as a dense scanning list

## Objective

Make 15 applications scannable as records rather than 15 stacked detail cards. Preserve full-row navigation while giving title, company, status, source, recency, and stage a stable comparison hierarchy.

## Files to update

- `apps/career/app/routes/applications.tsx`
- `apps/career/app/components/career/career-list.tsx`
- `apps/career/app/lib/utils/applicationUtils.ts` if presentation helpers are needed
- relevant application component tests

Because `CareerList` is shared by applications and positions, inspect its call sites before changing shared shell or row classes. If the applications-specific density cannot be applied safely to both consumers, add an explicit variant rather than changing all career lists accidentally.

## Row schema

Use this order unless CAREER-APP-01 documents an approved change:

- primary identity: job title, with company directly below;
- status: canonical status badge when present, intentional missing-state treatment when absent;
- source: normalized display label as an independent field;
- applied date: formatted date or approved missing-date label;
- stage: current stage and/or stage count only when meaningful;
- offer: retain the existing offer signal without making it visually compete with the application status;
- navigation: the entire row is a link to `/applications/:id`, with a subtle trailing chevron as reinforcement.

## Implementation steps

1. Remove the large rounded-card visual treatment from the application list. Use restrained framing and dividers appropriate to a tool-like scanning surface.
2. Reduce row vertical padding while preserving a multi-line title/company block and a stable minimum row height.
3. Use a stable responsive layout: identity remains flexible; metadata columns do not collapse into overlapping content; metadata wraps or moves below identity at narrow widths.
4. Render status, source, applied date, and stage as independent metadata fields. Do not concatenate them with punctuation such as `·`.
5. Normalize source labels for display without changing their filter values.
6. Make hover and focus-visible states clearly communicate row clickability. Keep the focus ring visible and inside the row bounds.
7. Preserve the accessible link name as meaningful title + company context. Do not make the chevron the only announced affordance.
8. Add fixture variants for populated, null, long-title, and long-company rows to prevent layout regressions.

## Acceptance criteria

- Fifteen populated rows fit in a materially shorter vertical span than the current layout without truncating essential fields.
- Status, source, and recency can be compared row-to-row without reading punctuation-separated prose.
- Null fields do not leave empty columns, dangling separators, or misleading blank badges.
- Long titles and companies do not overlap status or navigation controls.
- Keyboard focus is visible; Enter opens the same destination as a pointer click.
- The shared `CareerList` behavior for positions is unchanged unless an explicit variant is used and tested.

## Validation

Run the focused career component/route tests, then inspect populated, null, long-content, hover, and keyboard-focus states in the browser as described in CAREER-APP-05.
