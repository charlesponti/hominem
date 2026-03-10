---
title: "feat: Progressive disclosure UI for neko substance tracker"
type: feat
date: 2026-02-28
status: complete
issue_tracker: other
issue_url: pending
feature_description: "Implement progressive disclosure to reduce cognitive load by revealing UI elements contextually: welcome screen when no possessions, container CTA when no containers, auto-selection when only one item, context-aware Add Entry button, and progressive feature reveal for advanced options"
---

# feat: Progressive disclosure UI for neko substance tracker

## Problem Statement

The neko substance tracker currently displays all UI elements unconditionally regardless of data state. Users see dropdowns for possessions and containers even when empty, chart sections with no data, and the full dashboard on first launch. This creates cognitive overhead and a confusing initial experience. The app should guide users through a natural flow: add a possession → add a container → log usage, revealing UI elements only when relevant.

## User Scenarios & Testing (Mandatory)

### User Story 1 (P1) — First launch shows welcome state

- **Narrative:** Alice launches neko for the first time. She sees a welcoming empty state with a clear call-to-action to add her first substance, not an intimidating full dashboard.
- **Independent test:** Clear database or fresh install, launch app, verify welcome screen appears with "Add First Possession" button.
- **Acceptance scenarios:**
  - Given no possessions exist in the database, When the app loads, Then a centered welcome/empty state card renders with title "Start tracking your substances", description, and primary CTA button.
  - Given the welcome state is shown, When Alice clicks "[+ ADD FIRST POSSESSION]", Then the CreatePossessionDialog opens.
  - Given the welcome state is shown, Then all other dashboard elements (dropdowns, chart, history, search) are hidden.

### User Story 2 (P2) — Possession selected but no containers shows container CTA

- **Narrative:** Bob added his first possession but hasn't added any containers yet. The UI guides him to add a container before attempting to log usage.
- **Independent test:** Database with one possession but zero containers, select that possession, verify container area shows CTA instead of dropdown.
- **Acceptance scenarios:**
  - Given a possession is selected but has zero containers, When the summary section renders, Then the container dropdown is replaced with a prominent "Add Container" button/card.
  - Given the container CTA is shown, When Bob clicks "Add Container", Then the CreateContainerDialog opens.
  - Given the container CTA is shown, Then the usage chart and usage history sections are hidden (no data yet).

### User Story 3 (P2) — Full dashboard reveals after container added

- **Narrative:** Carol added both a possession and a container. The full dashboard now becomes visible with all features.
- **Independent test:** Database with possession + container + usage events, verify all sections render.
- **Acceptance scenarios:**
  - Given possessions and at least one container exist, When the dashboard renders, Then possession dropdown, container dropdown, usage chart, and usage history are all visible.
  - Given usage events exist, Then chart shows data and history shows list.
  - Given no usage events exist yet, Then history shows empty state with "Add your first usage" prompt.

### User Story 4 (P3) — Single item auto-selection hides dropdowns

- **Narrative:** Dave has only one possession and one container. Unnecessary dropdowns add clutter; the app should auto-select and show a subtle indicator to switch.
- **Independent test:** Database with exactly one possession and one container, verify dropdowns are replaced with inline display.
- **Acceptance scenarios:**
  - Given only one possession exists, When the dashboard renders, Then the possession dropdown is replaced with a compact inline display showing the name and a "switch" indicator.
  - Given only one container exists for the selected possession, Then the container dropdown is replaced similarly.
  - Given the inline display is shown, When the user clicks the switch indicator, Then the full dropdown appears temporarily.

### User Story 5 (P1) — Context-aware Add Entry button

- **Narrative:** Eve clicks "+ ADD ENTRY" but hasn't set up her inventory yet. The button should intelligently route her to the right setup dialog.
- **Independent test:** Click Add Entry with no possessions, verify possession dialog opens. Add possession, click Add Entry with no containers, verify container dialog opens.
- **Acceptance scenarios:**
  - Given no possessions exist, When the user clicks "+ ADD ENTRY", Then instead of opening the entry dialog, the CreatePossessionDialog opens.
  - Given possessions exist but no containers for the selected possession, When the user clicks "+ ADD ENTRY", Then the CreateContainerDialog opens.
  - Given possessions and containers both exist, When the user clicks "+ ADD ENTRY", Then the CombinedEntryDialog opens (current behavior).

### User Story 6 (P3) — Progressive reveal of advanced features

- **Narrative:** Frank is a new user who doesn't need import/export yet. Advanced features should fade in after initial setup.
- **Independent test:** Fresh install, verify import/export buttons hidden initially. Add first possession, verify they appear in header.
- **Acceptance scenarios:**
  - Given no possessions exist, When the header renders, Then the Import YAML and Export YAML buttons are hidden.
  - Given at least one possession exists, When the header renders, Then Import/Export buttons become visible.
  - Given more than 5 possessions exist, When the summary section renders, Then the search filter input appears.
  - Given 5 or fewer possessions exist, Then the search filter is hidden.

### Edge Cases

- Deleting the last possession returns to welcome screen (Phase 1)
- Deleting the last container returns to container CTA (Phase 2)
- Deleting all usage events keeps chart section but shows empty state in history
- Switching to a possession with no containers shows container CTA for that specific possession
- Import YAML creates first possession and transitions from welcome to Phase 2+
- Search filter should work regardless of progressive disclosure state when visible

## Requirements (Mandatory)

### Functional Requirements

- **FR-001**: Add `appPhase` state to track current UI state: `'welcome' | 'no-containers' | 'complete'`
- **FR-002**: App must compute current phase on every render based on: `possessions.length === 0` → welcome; `possession && containers.length === 0` → no-containers; otherwise → complete
- **FR-003**: Welcome phase must render centered EmptyState with "Start tracking your substances" title and "[+ ADD FIRST POSSESSION]" CTA
- **FR-004**: Welcome phase must hide: possession dropdown, container dropdown, usage chart, usage history, search filter, header import/export buttons
- **FR-005**: No-containers phase must render container CTA replacing the dropdown, with text "Add a container to start logging usage"
- **FR-006**: No-containers phase must hide: usage chart, usage history sections
- **FR-007**: Complete phase must render all dashboard sections when data exists
- **FR-008**: Implement single-item auto-selection: when `possessions.length === 1`, display possession inline with switch indicator instead of dropdown
- **FR-009**: Implement single-item auto-selection for containers: when `containers.length === 1`, display container inline
- **FR-010**: Modify "+ ADD ENTRY" button handler to check prerequisites: no possessions → open possession dialog; no containers → open container dialog; else → open entry dialog
- **FR-011**: Hide Import/Export buttons when `possessions.length === 0`
- **FR-012**: Show search filter only when `possessions.length > 5`
- **FR-013**: After successful YAML import, transition to appropriate phase based on imported data

### Key Entities

- `appPhase` — computed state: `'welcome' | 'no-containers' | 'complete'`
- `EmptyState` — existing component, leverage for welcome screen
- `SummaryCards` — needs conditional rendering based on phase
- `CombinedEntryDialog` — needs context-aware open logic
- Header component — needs conditional Import/Export button visibility

## Success Criteria (Mandatory)

- **SC-001**: Fresh install with empty database shows welcome screen with "Add First Possession" CTA, not full dashboard
- **SC-002**: After adding first possession (no containers), container CTA appears, chart/history hidden
- **SC-003**: After adding first container, full dashboard reveals with all sections
- **SC-004**: Single possession/container shows inline display instead of dropdown
- **SC-005**: "+ ADD ENTRY" opens correct dialog based on prerequisites (possession → container → entry)
- **SC-006**: Import/Export buttons hidden until first possession exists
- **SC-007**: Search filter hidden when 5 or fewer possessions
- **SC-008**: Deleting last possession returns to welcome screen; deleting last container returns to container CTA

## Goals and Non-Goals

### Goals

- [x] Implement phase computation based on data state
- [x] Create welcome screen for zero-possessions state
- [x] Create container CTA for no-containers state
- [x] Show full dashboard only when data supports it
- [x] Auto-select single items and hide unnecessary dropdowns
- [x] Make "+ ADD ENTRY" context-aware
- [x] Progressive reveal of Import/Export and search filter

### Non-Goals

- [ ] Redesign existing component aesthetics (keep current styling)
- [ ] Add new data fields or database changes
- [ ] Implement onboarding wizard flow (user-initiated, not forced)
- [ ] Add tutorial or tooltips (separate feature)

## Technical Context

- **Language/Version:** TypeScript 5.9, React 19, Electron 40
- **Primary Dependencies:** `@base-ui/react ^1.2`, `chart.js ^4.5`, `motion ^12`, `tailwindcss ^4`
- **Storage:** SQLite via sql.js; no schema changes required
- **Testing:** Playwright for E2E, manual verification steps documented
- **Target Platform:** macOS arm64/x64, Windows x64, Linux x64 (Electron desktop)
- **Constraints:** Must preserve existing functionality; progressive disclosure is purely UI state management

## Constitution Gate

- Gate status: PASS
- Violations and justifications (if any): None. This feature modifies only React state and conditional rendering in existing components. No schema changes, no breaking changes to existing functionality.

## Brainstorm Decisions

- Decision 1: Phase state should be computed, not stored — avoids sync issues
- Decision 2: Keep existing EmptyState component, customize props for welcome screen
- Decision 3: Inline display for single items should be compact but not hidden — user needs to know they can switch
- Decision 4: "+ ADD ENTRY" context-awareness should be in App.tsx handler, not in button component

## Clarifications

- Open questions discovered: None
- Resolutions: N/A

## Research Summary

### Local Findings

- `src/renderer/src/App.tsx:49-65`: State variables exist for possessions, containers, possession, container — already tracks needed data
- `src/renderer/src/App.tsx:68-72`: `filteredPossessions` computed from search — can extend for phase computation
- `src/renderer/src/components/SummaryCards.tsx:92-176`: Dropdowns render unconditionally — need conditional wrapper
- `src/renderer/src/components/EmptyState.tsx`: Component exists but not used in App.tsx — can leverage
- `src/renderer/src/App.tsx:139-141`: Auto-select first possession already exists — can extend for single-item detection
- `src/renderer/src/App.tsx:195-207`: `handleSubmitEvent` requires possession + container — validates context-awareness need

### External Findings

- [LogRocket: Progressive disclosure in UX design](https://blog.logrocket.com/ux-design/progressive-disclosure-ux-types-use-cases): Four variants identified — this plan uses conditional disclosure (show/hide based on state) and staged disclosure (progressive reveal as user progresses)
- [Design Depths: How Progressive Disclosure Can Simplify Your UX](https://medium.com/@DesignDepths/simplifying-ux-with-progressive-disclosure-83ff3931d3b0): "Users don't get overwhelmed with details immediately; instead, they see just what they need at each step" — core principle applied

### Risks and Unknowns

- Risk 1: User imports YAML with possessions but no containers — mitigated by transition to no-containers phase after import
- Risk 2: User deletes container while entry dialog is open — mitigated by dialog close on state change or validation in submit handler

## Proposed Approach

1. **Compute phase in App.tsx**: Add `appPhase` as a computed value (useMemo) based on possessions.length and containers.length
2. **Conditional rendering in App.tsx**: Wrap existing sections in phase-dependent conditionals, or pass phase to child components
3. **Update SummaryCards**: Accept optional `showContainerCTA` prop or handle phase internally; render container CTA when containers.length === 0
4. **Inline display for singles**: Add conditional rendering in SummaryCards for single-item case
5. **Context-aware Add Entry**: Modify click handler in App.tsx to check prerequisites before opening dialogs
6. **Progressive feature reveal**: Add conditional rendering for Import/Export buttons and search filter based on possession count
7. **Test edge cases**: Manual testing for delete scenarios returning to correct phase

## Acceptance Criteria

- [x] Fresh install shows welcome screen, not full dashboard
- [x] Adding first possession transitions to no-containers state
- [x] Adding first container shows full dashboard
- [x] Single possession/container shows inline display, not dropdown
- [x] Add Entry button opens correct dialog based on prerequisites
- [x] Import/Export hidden until first possession
- [x] Search filter hidden for ≤5 possessions
- [x] Delete last possession → welcome screen
- [x] Delete last container → container CTA

## Implementation Steps

- [x] Add `appPhase` computation in App.tsx using useMemo
- [x] Update App.tsx to conditionally render sections based on phase
- [x] Add welcome screen using EmptyState component in App.tsx
- [x] Update SummaryCards to show container CTA when containers.length === 0
- [x] Implement single-item inline display in SummaryCards
- [x] Make "+ ADD ENTRY" context-aware in App.tsx
- [x] Add conditional rendering for Import/Export buttons
- [x] Add conditional rendering for search filter
- [x] Verify edge cases (delete flows, import transitions)
- [x] Run typecheck and build validation

## Testing Strategy

- **Unit:** N/A (pure UI state changes)
- **Integration:** Manual testing of each phase transition
- **End-to-end:** Playwright test script covering: fresh install → welcome → add possession → no-containers → add container → complete → delete possession → welcome

## Dependencies and Rollout

- **Dependencies:** None — uses existing components and state
- **Sequencing:** Can implement incrementally (each phase independently testable)
- **Rollback:** Simple — remove conditional rendering logic, restore current behavior

## Artifact Plan (Optional Detail Directory)

- Detail root: docs/plans/2026-02-28-neko-progressive-disclosure/
- Optional artifacts: None required — single plan file sufficient

## References

- Internal: `src/renderer/src/App.tsx`, `src/renderer/src/components/SummaryCards.tsx`, `src/renderer/src/components/EmptyState.tsx`
- External: [LogRocket: Progressive disclosure](https://blog.logrocket.com/ux-design/progressive-disclosure-ux-types-use-cases), [Design Depths: Progressive disclosure](https://medium.com/@DesignDepths/simplifying-ux-with-progressive-disclosure-83ff3931d3b0)
- Related: [2026-02-28-neko-completeness-plan.md](./2026-02-28-neko-completeness-plan.md) (foundation for this work)
