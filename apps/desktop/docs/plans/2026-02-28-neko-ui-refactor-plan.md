---
title: "refactor: migrate neko desktop UI to monochrome scheme with combined dialog"
type: refactor
date: 2026-02-28
status: completed
issue_tracker: github
issue_url: https://github.com/charlesponti/neko-tracker/issues/1
feature_description: "the interface should only use monotone color scheme (black, white, 3 different shades of gray). only use green, yellow, and red for alerts. the add event and add pattern could be combined into a single baseui dialog (https://base-ui.com/react/components/dialog). the summary should not show json, use a beautiful layout and also display a line chart of usage per day overtime. use chartjs"
---
# refactor: migrate neko desktop UI to monochrome scheme with combined dialog

## Problem Statement

The neko desktop application (substance tracker) currently uses a "Japanese Hacker ASCII Minimalist Theme" with neon accent colors (cyan, green, pink, yellow) that violates the requested monochrome design system. Additionally, the "add event" and "add pattern" forms are displayed as inline sections rather than a unified modal dialog, and the summary display shows raw JSON instead of a visually appealing layout with usage analytics.

## User Scenarios & Testing (Mandatory)

### User Story 1 (P1)
- **Narrative**: As a user, I want to add events and patterns through a single unified dialog so that I have a consistent, focused input experience.
- **Independent test**: Open the combined dialog, switch between "Add Event" and "Add Pattern" tabs/forms, submit data, verify it saves correctly.
- **Acceptance scenarios**:
  - Given the app is loaded When the user clicks "Add Entry" button Then a BaseUI Dialog opens with tabbed interface for Event/Pattern
  - Given the dialog is open When user fills Event form and submits Then event is saved and summary updates
  - Given the dialog is open When user switches to Pattern tab, fills form, and submits Then pattern is saved and summary updates

### User Story 2 (P1)
- **Narrative**: As a user, I want to see my usage data in a beautiful layout with a line chart showing daily usage over time.
- **Independent test**: View the summary section, verify it displays formatted metrics and a Chart.js line chart.
- **Acceptance scenarios**:
  - Given summary data exists When the page loads Then summary displays acquisition value, used amount, remaining weight in formatted cards (not JSON)
  - Given usage history exists When summary renders Then a line chart shows usage per day over time using Chart.js
  - Given no data exists When summary renders Then empty state shows appropriate message

### User Story 3 (P1)
- **Narrative**: As a user, I want the interface to use only monochrome colors with alerts in green/yellow/red.
- **Independent test**: Inspect all UI elements to verify color compliance.
- **Acceptance scenarios**:
  - Given all UI elements When rendered Then colors are limited to black, white, and 3 gray shades
  - Given alert conditions (low stock, normal, critical) When triggered Then only green, yellow, or red are used respectively

### Edge Cases
- Empty containers list - show appropriate empty state
- Network/API errors when fetching summary - show error state with retry
- Invalid form input - show validation errors inline
- Large dataset for chart - ensure performance with many data points

## Requirements (Mandatory)

### Functional Requirements
- **FR-001**: Replace all neon colors (cyan, green, pink, yellow) with monochrome palette (black, white, 3 gray shades)
- **FR-002**: Use green/yellow/red ONLY for alert indicators (low/normal/critical stock levels)
- **FR-003**: Combine "Add Event" and "Add Pattern" forms into a single BaseUI Dialog component
- **FR-004**: Dialog must support tabbed/conditional switching between Event and Pattern input modes
- **FR-005**: Replace JSON summary display with formatted metric cards
- **FR-006**: Implement Chart.js line chart showing daily usage over time in summary section
- **FR-007**: Preserve all existing functionality (event/pattern submission, container selection, database reinit)

### Key Entities
- Container (id, label, tare_weight_g)
- Summary (acquisitionValue, used, remaining, totalWeight, containerId)
- Event (timestamp, container, amount, method)
- Pattern (start, end, amount, method)
- UsageDataPoint (date, amount)

## Success Criteria (Mandatory)
- **SC-001**: All UI colors conform to monochrome scheme (black, white, 3 grays) except alert indicators
- **SC-002**: Green/yellow/red alerts work correctly for stock level indicators
- **SC-003**: Combined dialog opens via button click and supports both Event and Pattern input
- **SC-004**: Summary displays formatted metrics (not JSON) with Chart.js line chart
- **SC-005**: All existing functionality preserved (submit events, submit patterns, container switching, reinit)
- **SC-006**: No console errors on load or interaction

## Goals and Non-Goals

### Goals
- [x] Implement monochrome color scheme with Tailwind CSS custom theme
- [x] Create BaseUI Dialog component combining event and pattern forms
- [x] Replace JSON summary with beautiful card layout
- [x] Add Chart.js line chart for usage over time
- [x] Add alert color indicators (green/yellow/red) for stock levels

### Non-Goals
- [ ] Change backend database schema or API
- [ ] Add new event/pattern fields beyond current implementation
- [ ] Implement mobile responsiveness (desktop-only focus)
- [ ] Add data export or import features

## Technical Context
- **Language/Version**: TypeScript, React 18+
- **Primary Dependencies**: 
  - @base-ui/react (Dialog component)
  - chart.js with react-chartjs-2
  - tailwindcss v4 (via @import "tailwindcss")
  - motion (framer-motion)
- **Storage**: SQLite (existing, unchanged)
- **Testing**: Manual verification via Electron app
- **Target Platform**: Desktop (Electron)
- **Constraints**: Must work within existing Electron renderer process
- **Scale/Scope**: Single-page desktop app, ~400 lines of UI code

## Constitution Gate
- **Gate status**: PASS
- **Violations and justifications (if any)**: None - this is a UI/UX refactor that maintains existing functionality

## Brainstorm Decisions
- Decision 1: Use BaseUI Dialog (unstyled, accessible) rather than building custom modal - aligns with modern React patterns in the codebase
- Decision 2: Use Chart.js via react-chartjs-2 wrapper - already used in finance app, consistent with project patterns
- Decision 3: Keep existing form validation (simple required fields) - no need to add complexity
- Decision 4: Use CSS custom properties for monochrome palette - matches existing Tailwind v4 @theme pattern

## Clarifications
- **Open questions discovered**:
  - Should the chart show usage per day for the last 30 days, 90 days, or all time?
  - Should alerts trigger based on remaining percentage (e.g., <20% = red, <50% = yellow)?
- **Resolutions**:
  - Default to last 30 days for chart data range
  - Use 20% threshold for red alert, 50% for yellow - can be adjusted later

## Research Summary

### Local Findings
- `src/renderer/src/style.css:8-50` - Current Tailwind v4 theme with neon colors that need replacement
- `src/renderer/src/App.tsx:200-206` - Summary JSON display that needs replacement with beautiful layout
- `src/renderer/src/App.tsx:209-321` - Inline forms for Add Event and Add Pattern that should combine into dialog
- `apps/finance/app/components/analytics/analytics-chart-display.tsx` - Existing Chart.js usage with AreaChart/BarChart patterns
- `packages/ui/src/components/ui/dialog.tsx` - Existing @hominem/ui Dialog component (but user requested BaseUI)

### External Findings
- [Base UI React Dialog](https://base-ui.com/react/components/dialog) - Controlled dialog with open/onOpenChange props, supports detached triggers, portal rendering
- [Chart.js Line Chart](https://www.chartjs.org/docs/latest/charts/line.html) - Standard line chart configuration for time series data

### Risks and Unknowns
- Risk 1: BaseUI Dialog may have different API than existing @hominem/ui Dialog - mitigation: follow BaseUI docs exactly
- Risk 2: Chart.js integration with React 18 strict mode - mitigation: use react-chartjs-2 which handles this
- Risk 3: Converting existing neon color references throughout App.tsx - mitigation: use find/replace with careful testing

## Proposed Approach

1. **Update Tailwind theme** in style.css to define monochrome palette:
   - Keep terminal-bg, terminal-surface, terminal-border (dark grays)
   - Add explicit gray-50, gray-100, gray-200, gray-300, gray-400, gray-500, gray-600
   - Define alert colors: alert-green, alert-yellow, alert-red

2. **Create CombinedDialog component** using BaseUI Dialog:
   - Import from @base-ui/react/dialog
   - Use tabs or conditional rendering for Event vs Pattern forms
   - Preserve all existing form fields and validation

3. **Refactor Summary display**:
   - Create metric cards for acquisition value, used, remaining, total weight
   - Add stock level indicator with green/yellow/red based on remaining percentage
   - Integrate Chart.js LineChart for usage over time

4. **Update all color references** in App.tsx:
   - Replace neon-cyan, neon-green, neon-pink, neon-yellow with monochrome equivalents
   - Keep neon-red only for critical alerts (or replace with alert-red)

5. **Test thoroughly**:
   - Verify all existing functionality works
   - Check color scheme compliance
   - Verify chart renders correctly

## Acceptance Criteria
- [x] Monochrome color scheme implemented (black, white, 3 grays)
- [x] Green/yellow/red only used for alerts
- [x] Combined BaseUI Dialog for add event/pattern works
- [x] Summary shows formatted cards, not JSON
- [x] Chart.js line chart displays usage over time
- [x] All existing functionality preserved

## Implementation Steps
- [x] Update src/renderer/src/style.css with monochrome theme and alert colors
- [x] Install @base-ui/react and chart.js dependencies
- [x] Create CombinedEntryDialog component with BaseUI Dialog
- [x] Refactor Summary component with cards and Chart.js
- [x] Update App.tsx to use new components and monochrome colors
- [x] Test all functionality in Electron app

## Testing Strategy
- **Unit**: Not applicable (UI refactor)
- **Integration**: Manual testing in Electron app - verify form submission, data persistence
- **End-to-end**: Verify full user flow: open dialog → add event → see updated summary with chart

## Dependencies and Rollout
- **Dependencies**: @base-ui/react, chart.js, react-chartjs-2
- **Sequencing**: 
  1. Update style.css theme
  2. Create dialog component
  3. Create summary component with chart
  4. Update App.tsx to use new components
- **Rollback**: Revert to previous App.tsx and style.css if issues arise

## Artifact Plan (Optional Detail Directory)
- Detail root: docs/plans/2026-02-28-neko-ui-refactor/
- Optional artifacts: spec.md, research.md (not needed - sufficient in plan)

## References
- Internal: `src/renderer/src/App.tsx:1-336` (current implementation)
- Internal: `src/renderer/src/style.css:1-100` (current theme)
- Internal: `apps/finance/app/components/analytics/analytics-chart-display.tsx` (Chart.js patterns)
- External: [BaseUI Dialog](https://base-ui.com/react/components/dialog)
- External: [Chart.js](https://www.chartjs.org)
