---
title: "feat: Complete neko substance tracker — missing features, bug fixes, and UX polish"
type: feat
date: 2026-02-28
status: complete
issue_tracker: other
issue_url: pending
feature_description: "Address all missing features (YAML import, edit/delete, usage history view, pattern execution, tare weight in stock calc, export), fix potential issues (sql.js last_insert_rowid, schema sync, stock calc, pattern dates), and add UX improvements (empty states, loading states, confirm dialogs, search/filter, keyboard shortcuts, error feedback, responsive layout)"
---

# feat: Complete neko substance tracker — missing features, bug fixes, and UX polish

## Problem Statement

The neko Electron desktop app has a functional foundation but is missing core CRUD operations (edit/delete), has an `importYamlFromPath` function targeting stale legacy tables (`acquisition`, `containers`, `usage_log`) rather than the current schema (`possessions`, `possessions_containers`, `possessions_usage`), uses `SELECT last_insert_rowid()` which needs to be consistently applied via `queryAll` (it already is, but the pattern must be preserved), does not surface usage event history as a list view, does not execute logged patterns to produce real usage events, ignores `tare_weight_g` in remaining-stock calculations, and has no export path. UX also lacks empty states, loading indicators, confirmation dialogs for destructive actions, search/filter, keyboard shortcuts, and user-facing error messages.

## User Scenarios & Testing (Mandatory)

### User Story 1 (P1) — Edit and delete a possession

- **Narrative:** Alice added a possession with the wrong amount. She wants to correct the amount and eventually delete it entirely when the supply is exhausted.
- **Independent test:** Run app, select possession from dropdown, trigger edit action, change amount, save. Verify updated amount displays in SummaryCards. Then delete; verify possession no longer appears in dropdown.
- **Acceptance scenarios:**
  - Given a possession exists, When Alice clicks the edit icon and changes the amount and saves, Then the updated amount is persisted to SQLite and reflected immediately in the UI.
  - Given a possession exists, When Alice triggers delete and confirms the confirmation dialog, Then the possession and its associated containers and usage rows are removed from the database.
  - Given Alice cancels a delete confirmation, Then the possession is not removed.

### User Story 2 (P1) — View usage history as a list

- **Narrative:** Bob wants to scroll through his past usage events to verify accuracy and delete a mistaken entry.
- **Independent test:** Add three events via the dialog, then open the usage history view; confirm all three appear. Delete one; confirm it disappears and summary updates.
- **Acceptance scenarios:**
  - Given usage events exist for the selected possession, When Bob opens the history view, Then all events are listed in reverse-chronological order showing date, amount, unit, and method.
  - Given an event row is in the list, When Bob deletes it, Then it is removed from the database and the summary recalculates.

### User Story 3 (P1) — YAML import targets new schema

- **Narrative:** Carol has a YAML file describing possessions, containers, and usage to bulk-load. She triggers Import YAML and expects her data to appear in the app.
- **Independent test:** Author a YAML file conforming to the new format, import it, verify possessions appear in the dropdown and usage populates the chart.
- **Acceptance scenarios:**
  - Given a well-formed YAML file with `possessions`, `containers`, and `usage` keys, When Carol imports it, Then records are inserted into `possessions`, `possessions_containers`, and `possessions_usage`.
  - Given a malformed YAML file, When Carol imports it, Then a user-visible error message is shown and no partial data is written (transaction rollback).

### User Story 4 (P2) — Export data to YAML

- **Narrative:** Dave wants to back up his data as YAML, edit it externally, and re-import.
- **Independent test:** Add possessions and events, trigger export, open the YAML file, verify it round-trips cleanly through import.
- **Acceptance scenarios:**
  - Given possessions, containers, and usage rows exist, When Dave triggers export, Then a YAML file is written containing all three entities in the new schema format.
  - Given the exported file is re-imported on a fresh database, Then data matches the original.

### User Story 5 (P2) — Tare weight in stock calculation

- **Narrative:** Eve measures her substance in a glass container with a known tare weight. She wants the remaining amount to reflect net substance, not gross.
- **Independent test:** Create a container with `tare_weight_g = 5`, log an event with gross amount 10 g (effective net 5 g). Verify remaining shows 5 g deducted from total (not 10 g).
- **Acceptance scenarios:**
  - Given a container with `tare_weight_g = 5` and a logged event of `amount = 10`, When the summary is computed, Then `used` reflects `amount - tare_weight_g = 5` for that event.
  - Given a container with `tare_weight_g = null`, When the summary is computed, Then the event amount is used as-is (backward compatible).

### User Story 6 (P2) — Empty state guidance

- **Narrative:** Frank opens the app for the first time. He sees a blank screen with no guidance.
- **Independent test:** Launch app with empty database; verify empty state components render with actionable CTA buttons.
- **Acceptance scenarios:**
  - Given no possessions exist, When the app loads, Then an empty state with "Add your first possession" button is shown.
  - Given a possession exists but has no containers, When the possession is selected, Then a contextual empty state prompts adding a container.

### Edge Cases

- Deleting a possession that has linked containers and usage rows (cascade should clean up child rows)
- YAML import with a possession that already exists by name (handle gracefully: skip or update, defined in FR-011)
- Pattern with `start_date == end_date` (single-day pattern: `days = 1`, amount stays as-is)
- `tare_weight_g` greater than the logged event amount (floor net at 0 to avoid negative used)
- Empty possession selector after deleting the last possession
- Chart with no usage data (show placeholder, not broken canvas)

## Requirements (Mandatory)

### Functional Requirements

- **FR-001**: `importYamlFromPath` must be rewritten to insert into `possessions`, `possessions_containers`, and `possessions_usage` exclusively (new schema only).
- **FR-002**: YAML import must wrap all inserts in a database transaction; on failure, rollback and return a structured error.
- **FR-003**: YAML export must query all three new tables and serialise them to a YAML file chosen via a save-file dialog.
- **FR-004**: Add `update-possession` IPC handler: accepts `id`, `name?`, `amount?`, `amount_unit?`; runs `UPDATE possessions SET ... WHERE id = ?` and calls `saveDb()`.
- **FR-005**: Add `delete-possession` IPC handler: cascades deletion of `possessions_containers` and `possessions_usage` rows before deleting the possession row.
- **FR-006**: Add `update-container` IPC handler: accepts `id`, `type?`, `label?`, `tare_weight_g?`.
- **FR-007**: Add `delete-container` IPC handler: also deletes linked `possessions_usage` rows.
- **FR-008**: Add `delete-usage-event` IPC handler: hard-deletes a single row from `possessions_usage` by id.
- **FR-009**: `get-summary` must account for `tare_weight_g`: for each usage row, subtract `tare_weight_g` of the linked container from the logged `amount` (floor at 0) to compute net used.
- **FR-010**: Add a `UsageHistory` component that fetches `get-usage` and renders a reverse-chronological list with delete-per-row capability.
- **FR-011**: YAML import with a duplicate possession name must skip that possession and its sub-entities (log warning, do not error).
- **FR-012**: All IPC handlers must expose structured error responses (`{ ok: false, error: string }`) and the renderer must surface them as visible error messages (not just `console.error`).
- **FR-013**: Loading states must be shown for all async IPC calls: possessions list, containers list, summary, usage history, chart data.
- **FR-014**: Destructive actions (delete possession, delete container, delete event) must show a `ConfirmDialog` before executing.
- **FR-015**: Keyboard shortcut `CmdOrCtrl+N` opens the Add Entry dialog; `Escape` closes any open dialog; `CmdOrCtrl+I` triggers Import YAML; `CmdOrCtrl+E` triggers Export YAML.
- **FR-016**: A search/filter input must filter the possessions list by name (client-side).
- **FR-017**: Export YAML must use `dialog.showSaveDialog` in the main process via a new `export-yaml` IPC handler.

### Key Entities

- `possessions` (id, name, amount, amount_unit)
- `possessions_containers` (id, possession_id, type, label, tare_weight_g)
- `possessions_usage` (id, possession_id, container_id, type, timestamp, amount, amount_unit, method, start_date, end_date)
- `ElectronAPI` — bridge type shared between `src/preload/index.ts`, `src/renderer/src/global.d.ts`, and `src/main/index.ts`
- `UsageHistory` — new renderer component
- `ConfirmDialog` — new shared renderer component
- `EmptyState` — new shared renderer component

## Success Criteria (Mandatory)

- **SC-001**: `importYamlFromPath` no longer references `acquisition`, `containers`, or `usage_log` tables; tests with a new-format YAML file insert records into all three new tables.
- **SC-002**: A possession can be created, edited, and deleted through the UI; a deleted possession disappears from the dropdown.
- **SC-003**: Usage history list renders all events for the selected possession in reverse-chronological order.
- **SC-004**: `get-summary` used amount is computed using net weight (gross minus tare) for containers with a non-null `tare_weight_g`.
- **SC-005**: All destructive actions require confirmation before executing.
- **SC-006**: Every empty data state (no possessions, no containers, no usage) renders a visible prompt with a clear action CTA.
- **SC-007**: All async IPC calls display a loading indicator; errors surface in the UI as visible messages, not just console output.
- **SC-008**: `bun run build` passes with no TypeScript errors after all changes.

## Goals and Non-Goals

### Goals

- [ ] Rewrite YAML import to target new schema
- [ ] Implement YAML export
- [ ] Add edit and delete for possessions, containers, and usage events
- [ ] Add usage history list view with per-row delete
- [ ] Incorporate tare weight into `get-summary` net calculation
- [ ] Add empty state components for all zero-data scenarios
- [ ] Add loading states for all async IPC calls
- [ ] Add ConfirmDialog for all destructive actions
- [ ] Add search/filter for possessions
- [ ] Add keyboard shortcuts (Cmd+N, Escape, Cmd+I, Cmd+E)
- [ ] Surface IPC errors as visible UI messages

### Non-Goals

- [ ] Pattern expansion into individual daily events (patterns remain as-is in the DB; chart already spreads them across days)
- [ ] Multi-window or multi-database support
- [ ] User authentication or encryption
- [ ] Cloud sync
- [ ] Migrations — schema changes remain out-of-scope per existing constraint

## Technical Context

- **Language/Version:** TypeScript 5.9, React 19, Electron 40
- **Primary Dependencies:** `sql.js ^1.14`, `@base-ui/react ^1.2`, `chart.js ^4.5`, `yaml ^2.8`, `motion ^12`, `tailwindcss ^4`
- **Storage:** SQLite via sql.js (WASM); file at `~/.config/hominem/db.dev.sqlite` (dev) / `db.sqlite` (prod); `saveDb()` persists after every write
- **Testing:** Playwright (`@playwright/test ^1.58`); `bun test` for unit tests; `bun run typecheck` for TS validation
- **Target Platform:** macOS arm64/x64, Windows x64, Linux x64 (Electron desktop)
- **Constraints:** No migrations via code — only read/write existing schema; sql.js does not expose `lastInsertRowid` directly — must use `SELECT last_insert_rowid()` via `queryAll` (pattern already in place at `src/main/index.ts:124`); no `express`, no `pg`, use `bun:sqlite` conventions where applicable
- **Scale/Scope:** Single user, local SQLite, hundreds to low thousands of rows

## Constitution Gate

- **Gate status:** PASS
- No violations. Plan respects existing schema constraints, does not introduce migrations, stays within the Electron/React/sql.js stack, and all new features are additive.

## Brainstorm Decisions

- New schema only for YAML import (no backward compat with old tables) — confirmed by user
- Hard delete (no soft-delete) for possessions/containers/events — confirmed by user
- Pattern rows remain stored as-is; no expansion into daily events (they already factor into chart and summary via aggregation logic in `get-usage-by-date` and `get-summary`)
- No issue tracker — plan file is the tracking artifact

## Clarifications

- **Open questions discovered:** None remaining after user Q&A
- **Resolutions:**
  - YAML import: new schema only
  - Delete: hard delete with cascade
  - Issue tracker: none

## Research Summary

### Local Findings

- [`src/main/index.ts:124`] `last_insert_rowid()` pattern is already correctly used via `queryAll('SELECT last_insert_rowid() as id')` — must preserve this pattern for all new insert handlers
- [`src/main/index.ts:102`] `get-possessions` filters `WHERE amount IS NOT NULL` — edit handler must handle null amounts gracefully
- [`src/main/index.ts:148-178`] `get-summary` computes `used` by summing `amount` from `possessions_usage` with no tare adjustment — FR-009 fix goes here
- [`src/shared/lib.ts:159-243`] `importYamlFromPath` inserts into `acquisition`, `containers`, `usage_log` — completely mismatched with current schema; full rewrite required
- [`src/shared/lib.ts:152-156`] `runQuery` calls `saveDb()` on every write — new transaction-based import must call `saveDb()` once after committing, not per row
- [`src/shared/lib.ts:85-91`] `saveDb()` exports sql.js DB to buffer and writes to file — this is the persistence mechanism; no `BEGIN TRANSACTION` is used anywhere currently
- [`src/renderer/src/App.tsx:62-98`] No loading states around any `fetchXxx` calls — state is set synchronously after await, no `isLoading` flag
- [`src/renderer/src/App.tsx:141-148`] Import error is `console.error` only — no user-visible feedback
- [`src/renderer/src/global.d.ts:45-57`] `ElectronAPI` interface must be extended for: `updatePossession`, `deletePossession`, `updateContainer`, `deleteContainer`, `deleteUsageEvent`, `exportYAML`
- [`src/renderer/src/components/SummaryCards.tsx:43-49`] Stock level calculation does not use tare weight — still based on raw `remaining` from `get-summary`
- [`package.json:22-34`] `@base-ui/react` already installed — use `Dialog` for `ConfirmDialog`; `AlertDialog` if available in the installed version

### External Findings

- [sql.js Documentation](https://sql.js.org/documentation/Database.html): `Database.run()` returns void; `last_insert_rowid()` must be retrieved via a follow-up `SELECT` — already correctly implemented
- [SQLite transactions in sql.js](https://github.com/sql-js/sql.js): wrap bulk inserts in `BEGIN; ... COMMIT;` by calling `db.run('BEGIN')` / `db.run('COMMIT')` / `db.run('ROLLBACK')` directly — no ORM needed
- [Base UI AlertDialog](https://base-ui.com/react/components/alert-dialog): available in `@base-ui/react` for accessible confirmation dialogs
- [NN/g Empty State Guidelines](https://www.nngroup.com/articles/empty-state-interface-design/): provide title, description, and a direct action CTA
- [Net Weight = Gross - Tare](https://www.maersk.com/logistics-explained/shipping-documentation/2024/09/16/gross-tare-net-weight): standard formula; floor at 0 if tare > gross

### Risks and Unknowns

- **sql.js transaction support** — sql.js supports `BEGIN`/`COMMIT`/`ROLLBACK` as raw SQL via `db.run()`; must verify the installed version (1.14) supports this (it does — it is standard SQLite 3)
- **@base-ui/react AlertDialog vs Dialog** — the existing `CombinedEntryDialog` uses `Dialog`; if `AlertDialog` is not in the installed v1.2 bundle, fall back to using `Dialog` with an alert role attribute
- **Cascade delete without FK constraints** — sql.js may not have `PRAGMA foreign_keys = ON` active; must implement cascade as explicit DELETE statements in the `delete-possession` and `delete-container` handlers
- **YAML round-trip fidelity** — `amount_unit` and `tare_weight_g` types must be preserved exactly through YAML serialization to avoid type coercion bugs on re-import

## Proposed Approach

The work is organized into five layers executed in dependency order:

1. **Core IPC layer** (`src/main/index.ts`, `src/shared/lib.ts`) — add missing handlers (update/delete for all entities, export-yaml), fix `get-summary` tare calculation, rewrite `importYamlFromPath`.
2. **Type contract layer** (`src/preload/index.ts`, `src/renderer/src/global.d.ts`) — extend `ElectronAPI` with all new methods.
3. **Shared UI components** (`src/renderer/src/components/`) — create `ConfirmDialog`, `EmptyState`, `LoadingSpinner`/skeleton; create `UsageHistory` list component.
4. **App integration** (`src/renderer/src/App.tsx`) — wire new handlers into state, add loading flags, surface errors, add keyboard shortcuts, add search/filter.
5. **Validation** — `bun run typecheck` + `bun run build` must pass clean.

Each layer is independently testable before moving to the next.

## Acceptance Criteria

- [ ] `importYamlFromPath` references zero legacy table names (`acquisition`, `containers`, `usage_log`)
- [ ] Importing a valid new-format YAML inserts rows into all three new tables
- [ ] Exporting produces a YAML file that can be cleanly re-imported
- [ ] Editing a possession's amount and saving persists the change to SQLite
- [ ] Deleting a possession removes it and all its containers and usage rows
- [ ] Usage history list renders for selected possession; deleting a row updates summary
- [ ] Summary `used` deducts tare weight for events with non-null container tare weight
- [ ] No destructive action executes without a confirmation dialog
- [ ] All zero-data states display an empty state component with an actionable CTA
- [ ] Loading spinners/skeletons appear during every async IPC fetch
- [ ] IPC errors display as visible in-UI messages (not console only)
- [ ] Keyboard shortcuts Cmd+N, Cmd+I, Cmd+E, Escape work as specified
- [ ] `bun run typecheck` exits 0 with no errors

## Implementation Steps

- [ ] **Step 1 — Rewrite `importYamlFromPath`** in `src/shared/lib.ts`: update `Data` type and insert logic to target `possessions`, `possessions_containers`, `possessions_usage`; wrap in `BEGIN`/`COMMIT`/`ROLLBACK`; call `saveDb()` once after commit. Expected artifact: updated `lib.ts` with new `Data` type and import function.
- [ ] **Step 2 — Add `exportYamlToPath`** in `src/shared/lib.ts`: query all three tables, serialise to YAML string, write to user-chosen path via `dialog.showSaveDialog`. Expected artifact: new export function in `lib.ts`.
- [ ] **Step 3 — Add `export-yaml` IPC handler** in `src/main/index.ts` calling `exportYamlToPath`. Expected artifact: new handler block.
- [ ] **Step 4 — Add update/delete IPC handlers** in `src/main/index.ts`: `update-possession`, `delete-possession` (cascade), `update-container`, `delete-container` (cascade), `delete-usage-event`. Validate with `SELECT last_insert_rowid()` pattern only where applicable.
- [ ] **Step 5 — Fix `get-summary` tare calculation** in `src/main/index.ts:163-177`: join `possessions_usage` with `possessions_containers` on `container_id`, subtract `tare_weight_g` (floor 0) per event when computing `used`.
- [ ] **Step 6 — Extend `ElectronAPI` interface** in both `src/preload/index.ts` and `src/renderer/src/global.d.ts`: add `updatePossession`, `deletePossession`, `updateContainer`, `deleteContainer`, `deleteUsageEvent`, `exportYAML`.
- [ ] **Step 7 — Wire new IPC methods in preload** in `src/preload/index.ts`: add `ipcRenderer.invoke` calls for all new handlers.
- [ ] **Step 8 — Create `ConfirmDialog` component** at `src/renderer/src/components/ConfirmDialog.tsx`: uses `@base-ui/react` Dialog with danger/warning/info variant; exposes `useConfirm` hook returning promise-based `confirm()` function.
- [ ] **Step 9 — Create `EmptyState` component** at `src/renderer/src/components/EmptyState.tsx`: accepts `title`, `description`, `action: { label, onClick }`.
- [ ] **Step 10 — Create `UsageHistory` component** at `src/renderer/src/components/UsageHistory.tsx`: fetches via `getUsage(possessionId)`, displays reverse-chronological list, integrates `ConfirmDialog` for delete, refetches summary after delete. Show `EmptyState` when no rows.
- [ ] **Step 11 — Add loading state hooks** in `src/renderer/src/App.tsx`: add `isLoadingPossessions`, `isLoadingContainers`, `isLoadingSummary`, `isLoadingUsage` boolean state flags; show skeleton/spinner in each section while true.
- [ ] **Step 12 — Add error state and toast** in `src/renderer/src/App.tsx`: add `error` state string; display in a dismissible banner above the main grid.
- [ ] **Step 13 — Add Edit Possession UI** in `src/renderer/src/App.tsx` and `SummaryCards.tsx`: add edit icon/button next to possession selector that opens an inline edit form or reuses `CreatePossessionDialog` in edit mode.
- [ ] **Step 14 — Add Delete Possession UI** with `ConfirmDialog` in `src/renderer/src/App.tsx`.
- [ ] **Step 15 — Add Export YAML button** to the header bar in `src/renderer/src/App.tsx`.
- [ ] **Step 16 — Add possession search/filter input** in `src/renderer/src/components/SummaryCards.tsx`: client-side filter of the `possessions` array by name.
- [ ] **Step 17 — Add keyboard shortcuts** in `src/main/index.ts`: register `CmdOrCtrl+N`, `CmdOrCtrl+I`, `CmdOrCtrl+E` via `globalShortcut` and send IPC events to renderer; handle `Escape` in renderer via `useEffect` keydown listener.
- [ ] **Step 18 — Integrate `UsageHistory`** into `src/renderer/src/App.tsx`: add a third section below the grid, passing `possession` and a `onSummaryRefresh` callback.
- [ ] **Step 19 — Validate**: run `bun run typecheck` and `bun run build`; fix any TypeScript errors. Artifact: clean build output.

## Testing Strategy

- **Unit:** `bun test` — unit test `importYamlFromPath` with a fixture YAML file to verify inserts into correct tables; unit test tare weight calculation logic in isolation.
- **Integration:** `bun test` — integration test for `get-summary` with a seeded db to verify net weight calculation; test cascade delete by asserting child rows are removed.
- **End-to-end:** Playwright (`bun run test`) — test full import → view → edit → delete flow; test export → re-import round trip; test empty state renders when DB is empty.

## Dependencies and Rollout

- **Dependencies:** All npm dependencies already installed (`@base-ui/react`, `yaml`, `sql.js`). No new packages required.
- **Sequencing:** Steps 1–7 (backend + types) must complete before Steps 8–19 (UI) to avoid type errors. Step 19 (typecheck + build) must be last.
- **Rollback:** All changes are additive to existing IPC handlers (new channels, no channel renames). Old channels remain intact. Rolling back is a git revert.

## Artifact Plan (Optional Detail Directory)

- Detail root: `docs/plans/2026-02-28-neko-completeness-plan/`
- Optional artifacts: `tasks.md` (step-by-step execution checklist), `data-model.md` (YAML schema format spec for import/export)

## References

- Internal: [`src/main/index.ts:102-278`] — all existing IPC handlers
- Internal: [`src/shared/lib.ts:159-243`] — `importYamlFromPath` (to be rewritten)
- Internal: [`src/main/index.ts:148-178`] — `get-summary` (tare fix)
- Internal: [`src/preload/index.ts:53-78`] — `ElectronAPI` interface (to be extended)
- Internal: [`src/renderer/src/App.tsx:62-98`] — data fetch functions (loading state target)
- External: [sql.js API](https://sql.js.org/documentation/Database.html)
- External: [Base UI Dialog](https://base-ui.com/react/components/dialog)
- External: [NN/g Empty States](https://www.nngroup.com/articles/empty-state-interface-design/)
- External: [Net/Tare Weight](https://www.maersk.com/logistics-explained/shipping-documentation/2024/09/16/gross-tare-net-weight)
