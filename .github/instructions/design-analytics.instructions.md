---
applyTo: 'apps/**'
---

# Design - Analytics

Concise rules and guiding principles for designing analytics components used across our apps (Florin dashboards and other analytics surfaces). Follow the canonical UI and accessibility guidance in `react.instructions.md` and use this document to make analytics-specific decisions predictable, consistent, and testable.

## Purpose

- Make data understandable and actionable at a glance ✅
- Ensure analytics components are inclusive and perform well on mobile and desktop ⚡
- Provide clear expectations for states, formatting, interaction, accessibility, and verification 🔧

## Core Principles

- Data-first: show what the metric measures, the unit, and the time window (including timezone). Wherever applicable, display a brief human-readable definition or link to docs.
- Clarity & hierarchy: surface the most important metrics first; use visual weight, spacing, and concise labels to establish hierarchy.
- Consistency: use shared formatting helpers (`formatCurrency`, `formatNumber`, `formatDate`) and design tokens for color/spacing/typography to ensure consistent presentation.
- Mobile-first & responsive: design for small screens first — tables should collapse to stacked cards and charts should adapt to container width.
- Accessibility-by-default: charts and tables must provide text alternatives, keyboard interactions, and meet WCAG contrast requirements.
- Performance & scalability: aggregate and paginate server-side; virtualize long lists/tables and avoid loading excessive historical points on initial render.
- Testability & observability: include storybook fixtures, unit tests for formatting/transformations, visual regression tests, and telemetry hooks where appropriate.

Key rules:

- Provide clear loading/error/empty states for every display.
- Use `formatCurrency` for all monetary values and consistent color tokens for positive/negative values.
- Desktop: tables; Mobile: stacked cards. Charts must be responsive and accessible.

## Component Patterns

- Metric cards: include label, primary value, delta (direction + percent), optional sparkline, and definition popover.
- Charts:
  - Keep visuals simple and decluttered (minimal gridlines, clear axes, meaningful ticks).
  - Do not rely on color alone — use shapes, icons, or labels for directionality.
  - Tooltips must be accessible by keyboard and touch; include formatted value and timestamp.
  - Provide a textual summary and a table fallback for screen-reader users and exports.
- Tables:
  - Column order should reflect user priorities. Support sorting, filtering, and column visibility.
  - Prefer pagination or explicit "Load more" for analytics tables.
  - Export (CSV/JSON) should be available for actionable datasets.
- Mobile:
  - Collapse tables into stacked cards showing critical fields with details hidden behind a disclosure.
  - Ensure touch-friendly hit targets and make tooltips accessible via a tap-to-open pattern.

## Formatting & Tokens

- Currency: always use `formatCurrency(locale, currency)` and show currency code if ambiguous.
- Numbers: use `formatNumber` with compact notation for large values (e.g., 1.2M).
- Dates: include explicit period labels ("Last 30 days") and timezone where relevant.
- Use semantic color tokens (e.g., `color-success`, `color-danger`, `color-neutral-500`) — do not hardcode colors.
- Positive/negative semantics should respect domain norms (e.g., revenue positive, refunds negative).

## Data Handling & Performance

- Aggregate server-side and request only the data needed for the default view; offer on-demand detail endpoints.
- Limit initial chart points (e.g., 100–500) and enable zoom/rollup for higher fidelity exploration.
- Cache responses and surface a "Last updated" timestamp; show staleness indicators when appropriate.
- Debounce filter changes to reduce API load.

## Loading, Error & Empty States

- Loading: use skeletons that reflect the final layout; for charts use a subtle placeholder chart.
- Empty: provide helpful guidance and CTAs (e.g., change date range, add data source, or link to docs).
- Error: show a brief, actionable message and a retry control. Log details internally for debugging.

## Interactions & Microcopy

- Provide preset date ranges (Last 7 days, Last 30 days, MTD, YTD) and an advanced range selector.
- Show metric definitions via an info icon or inline help.
- Offer data exports and a lightweight "snapshot"/share option when appropriate.

## Accessibility

- Every chart must include a textual summary (1–2 sentences) describing the key insight and be present in the DOM.
- Ensure color contrast meets WCAG AA and avoid color-only encodings.
- Interactive elements must be keyboard-focusable with ARIA roles/labels as needed.
- Provide a table fallback or export for complex visualizations.

## Testing & Verification ✅

- Visual smoke tests for key routes: `/analytics`, `/budget`, `/finance/runway`, and other analytics pages.
- Unit tests for formatting helpers and delta calculations.
- Accessibility tests (axe) covering charts, filters, and tables.
- Storybook stories for each component showing loading, empty, error, small and large dataset states.

## Quick Checklist (every analytics view)

1. Title and short description/definition ✅
2. Time window and timezone visible ✅
3. Primary KPI & delta with clear semantics ✅
4. Chart or table with accessible alternative or summary ✅
5. Loading/error/empty states implemented ✅
6. Export or data access available where applicable ✅
7. Tests: unit, visual, and accessibility ✅

---

> Implementation note: Prefer reusing shared helpers and tokens from `@hominem/ui` and `@hominem/utils`. When in doubt, consult `react.instructions.md` and the design system docs.


