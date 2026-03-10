# Tasks: neko UI Refactor

**Plan**: `docs/plans/2026-02-28-neko-ui-refactor-plan.md`  
**Mode**: tasks

---

## Phase 1: Setup

| ID | Description |
|----|-------------|
| T001 | Install dependencies: `@base-ui/react`, `chart.js`, `react-chartjs-2` |
| T002 | Verify existing build works (`bun run` or `bun dev`) |

---

## Phase 2: Foundational (blocks all stories)

| ID | Description | Dependencies |
|----|-------------|--------------|
| T003 [P] | Update `src/renderer/src/style.css` - replace neon colors with monochrome palette (black, white, gray-100 to gray-600) | T001 |
| T004 [P] | Add alert color tokens to style.css: `alert-green`, `alert-yellow`, `alert-red` | T003 |
| T005 | Verify Tailwind theme changes compile correctly | T004 |

---

## Phase 3: User Story 1 - Combined Dialog

| ID | Description | Dependencies |
|----|-------------|--------------|
| T006 | Create `src/renderer/src/components/CombinedEntryDialog.tsx` using BaseUI Dialog | T001, T004 |
| T007 | Implement tab/conditional switching between Event and Pattern forms in dialog | T006 |
| T008 | Migrate existing form fields from App.tsx to CombinedEntryDialog (timestamp, amount, method for events; start, end, amount, method for patterns) | T006, T007 |
| T009 | Add form submission handlers that call `window.electronAPI.addEvent` and `window.electronAPI.addPattern` | T007, T008 |
| T010 | Test dialog open/close and form submission | T009 |

---

## Phase 4: User Story 2 - Summary with Chart

| ID | Description | Dependencies |
|----|-------------|--------------|
| T011 | Create `src/renderer/src/components/SummaryCards.tsx` - formatted metric display (acquisitionValue, used, remaining, totalWeight) | T004 |
| T012 | Add stock level indicator with alert colors (green >50%, yellow 20-50%, red <20%) | T011 |
| T013 | Create `src/renderer/src/components/UsageChart.tsx` using react-chartjs-2 LineChart | T001 |
| T014 | Implement 30-day usage data aggregation for chart | T013 |
| T015 | Integrate UsageChart into Summary section | T013, T014 |

---

## Phase 5: User Story 3 - Color Compliance

| ID | Description | Dependencies |
|----|-------------|--------------|
| T016 | Update all color classes in App.tsx: replace `text-neon-cyan`, `text-neon-green`, `text-neon-pink`, `text-neon-yellow` with monochrome equivalents | T004 |
| T017 | Update border and background classes to use new gray palette | T016 |
| T018 | Verify all interactive elements (buttons, inputs, selects) use compliant colors | T017 |

---

## Phase 6: Integration & Polish

| ID | Description | Dependencies |
|----|-------------|--------------|
| T019 | Update `src/renderer/src/App.tsx` to use CombinedEntryDialog and SummaryCards components | T006, T011 |
| T020 | Add "Add Entry" button to trigger CombinedEntryDialog | T019 |
| T021 | Remove inline forms (Add Event section, Add Pattern section) from App.tsx | T019 |
| T022 | Test full user flow: open dialog → add event → verify summary updates with chart | T010, T015, T020 |
| T023 | Verify container selection still works | T022 |
| T024 | Verify database reinit button still works | T022 |
| T025 | Check for console errors | T022 |

---

## Dependency Graph

```
Phase 1 (Setup)
├── T001 ─┬─► T003 ─► T004 ─► T005
│        ├─► T006 ─► T007 ─► T008 ─► T009 ─► T010
│        └─► T011 ─► T012
T002 ─────────┘         │
                        ├─► T013 ─► T014 ─► T015
                        │
T004 ───────────────────┼─► T016 ─► T017 ─► T018
                        │
                        └─► T019 ─► T020 ─► T021
                                           │
T010 ◄─────────────────────────────────────┼────► T022 ◄─ T015
                                           │
T018 ◄─────────────────────────────────────┘     │
                                           T023, T024, T025
```

## Parallel Opportunities

- **T003 and T004** can run in parallel (both modify style.css independently)
- **T006, T011, T013** can start after T001/T004 complete
- **T016, T017** can run in parallel (both update App.tsx colors)

## Story Mapping

| Story | Tasks |
|-------|-------|
| US1: Combined Dialog | T006, T007, T008, T009, T010 |
| US2: Summary + Chart | T011, T012, T013, T014, T015 |
| US3: Color Compliance | T016, T017, T018 |
| Integration | T019, T020, T021, T022, T023, T024, T025 |

---

## Acceptance Criteria Check

- [ ] SC-001: Monochrome colors (T003, T004, T016, T017)
- [ ] SC-002: Alert colors work (T012)
- [ ] SC-003: Combined dialog works (T006-T010)
- [ ] SC-004: Summary with chart (T011-T015)
- [ ] SC-005: Existing functionality preserved (T022-T024)
- [ ] SC-006: No console errors (T025)
