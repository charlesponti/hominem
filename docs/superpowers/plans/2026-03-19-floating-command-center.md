# Floating Command Center Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the docked web sidebar with a summonable floating command center that is open by default on `/home`, hidden by default elsewhere, and supports hotkey, toggle, and `Esc` dismissal.

**Architecture:** Build a shared floating command-center shell in `packages/ui` on top of the existing `Command` primitives, then wire authenticated web layout state and route-specific context through a narrow adapter layer in `apps/web`. Remove sidebar-based layout assumptions rather than patching them further, and keep Composer layered independently so medium-width overlap disappears at the shell boundary.

**Tech Stack:** React 19, React Router 7, cmdk/shadcn command primitives, GSAP, Vitest, Testing Library, Bun

---

## File Map

### Shared UI

- Modify: `packages/ui/src/components/ui/command.tsx`
  - Reuse existing primitives; only extend if the floating shell needs a missing export or composition helper.
- Create: `packages/ui/src/components/navigation/floating-command-center.tsx`
  - Shared floating command-center shell, panel chrome, toggle, open/close behavior, keyboard handling, GSAP motion.
- Create: `packages/ui/src/components/navigation/floating-command-center.types.ts`
  - Narrow data contract for global actions, search items, and contextual sections.
- Create: `packages/ui/src/components/navigation/floating-command-center.test.tsx`
  - Shared UI behavior tests for open state, toggle, `Esc`, and rendering of sections.
- Modify: `packages/ui/src/components/layout/app-layout.tsx`
  - Remove sidebar-mode assumptions from the authenticated web usage path if still present.
- Modify: `packages/ui/src/components/layout/index.ts`
  - Export the new shared command-center component if needed.

### Web App

- Modify: `apps/web/app/routes/layout.tsx`
  - Stop mounting `NotesSidebar`; mount the floating command-center shell/provider instead.
- Modify: `apps/web/app/routes/home-view.tsx`
  - Make `/home` host the open-by-default panel state and any route-specific empty-state or landing content.
- Create: `apps/web/app/components/command-center/web-command-center.tsx`
  - App-specific wrapper around the shared UI shell.
- Create: `apps/web/app/components/command-center/use-command-center-state.ts`
  - Route-aware open/close defaults, `/home` persistence, toggle handling, `Esc`, and summon hotkey orchestration.
- Create: `apps/web/app/components/command-center/use-command-center-context.ts`
  - Map current route into contextual command sections.
- Create: `apps/web/app/components/command-center/use-command-center-actions.ts`
  - Global actions and navigation/search item definitions.
- Create: `apps/web/app/components/command-center/web-command-center.test.tsx`
  - App-layer tests for route-aware defaults and context changes.
- Modify: `apps/web/app/components/notes-sidebar.tsx`
  - Delete after parity is reached, or mark as unused and remove imports first.
- Modify: `apps/web/app/hooks/use-inbox-stream.ts`
  - Reuse as contextual data source for recent notes/chats.
- Modify: `apps/web/app/components/composer/use-composer-mode.ts`
  - Reuse route knowledge if helpful; avoid duplicating route parsing logic.
- Create/Modify: `apps/web/tests/*.spec.ts`
  - Add E2E coverage for summon/close/default-open behavior.

## Chunk 1: Shared Floating Shell

### Task 1: Define the shared command-center data contract

**Files:**
- Create: `packages/ui/src/components/navigation/floating-command-center.types.ts`
- Test: `packages/ui/src/components/navigation/floating-command-center.test.tsx`

- [ ] **Step 1: Write the failing test**

Add a test that renders the future shared shell with:
- one global action group
- one search result item
- one contextual section
- `defaultOpen={false}`

Assert:
- the floating toggle is visible
- the panel content is hidden initially
- opening shows the provided groups in order

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run --filter @hominem/ui test -- src/components/navigation/floating-command-center.test.tsx`
Expected: FAIL because the file/component does not exist yet

- [ ] **Step 3: Write minimal implementation**

Create the types file with focused interfaces only:
- `CommandCenterAction`
- `CommandCenterItem`
- `CommandCenterSection`
- `FloatingCommandCenterProps`

Keep it DRY and route-agnostic.

- [ ] **Step 4: Run test to verify it still fails for the right reason**

Run: `bun run --filter @hominem/ui test -- src/components/navigation/floating-command-center.test.tsx`
Expected: FAIL because the component is not implemented yet, not because of type errors

- [ ] **Step 5: Commit**

Run:
```bash
git add packages/ui/src/components/navigation/floating-command-center.types.ts packages/ui/src/components/navigation/floating-command-center.test.tsx
git commit -m "test: scaffold floating command center contract"
```

### Task 2: Build the shared floating panel shell

**Files:**
- Create: `packages/ui/src/components/navigation/floating-command-center.tsx`
- Modify: `packages/ui/src/components/ui/command.tsx`
- Test: `packages/ui/src/components/navigation/floating-command-center.test.tsx`

- [ ] **Step 1: Write the failing test**

Extend the test file with cases for:
- visible floating toggle
- toggle opens the panel
- `Esc` closes the panel
- when `defaultOpen` is true, the panel renders immediately

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run --filter @hominem/ui test -- src/components/navigation/floating-command-center.test.tsx`
Expected: FAIL because open/close behavior is not implemented

- [ ] **Step 3: Write minimal implementation**

Build `floating-command-center.tsx` using existing `Command`, `CommandInput`, `CommandList`, `CommandGroup`, and `CommandItem`.

Requirements:
- internal `isOpen` state with controlled/uncontrolled support if needed
- visible floating toggle button
- command input autofocus on open
- `Esc` closes the panel
- render stable top groups before contextual sections
- no route-specific logic in this shared component

If `command.tsx` needs a small export/helper to make composition cleaner, add only that.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run --filter @hominem/ui test -- src/components/navigation/floating-command-center.test.tsx`
Expected: PASS

- [ ] **Step 5: Refactor**

Keep the shell small:
- extract tiny presentational helpers only if they reduce duplication
- keep no business logic in `command.tsx`

- [ ] **Step 6: Commit**

Run:
```bash
git add packages/ui/src/components/navigation/floating-command-center.tsx packages/ui/src/components/navigation/floating-command-center.types.ts packages/ui/src/components/navigation/floating-command-center.test.tsx packages/ui/src/components/ui/command.tsx
git commit -m "feat: add shared floating command center shell"
```

### Task 3: Add motion and accessibility polish to the shared shell

**Files:**
- Modify: `packages/ui/src/components/navigation/floating-command-center.tsx`
- Test: `packages/ui/src/components/navigation/floating-command-center.test.tsx`

- [ ] **Step 1: Write the failing test**

Add tests for:
- focus moves to the command input on open
- focus returns to the toggle on close
- reduced-motion mode still opens/closes correctly

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run --filter @hominem/ui test -- src/components/navigation/floating-command-center.test.tsx`
Expected: FAIL on focus behavior or reduced-motion contract

- [ ] **Step 3: Write minimal implementation**

Add:
- GSAP open/close motion with a gentle rise/settle
- reduced-motion guard
- last-focus restoration
- clear accessible labels for toggle and panel

Do not overbuild animation variants. One polished path is enough.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run --filter @hominem/ui test -- src/components/navigation/floating-command-center.test.tsx`
Expected: PASS

- [ ] **Step 5: Run the full UI suite for this chunk**

Run: `bun run --filter @hominem/ui test`
Expected: PASS

- [ ] **Step 6: Commit**

Run:
```bash
git add packages/ui/src/components/navigation/floating-command-center.tsx packages/ui/src/components/navigation/floating-command-center.test.tsx
git commit -m "feat: polish floating command center motion and accessibility"
```

## Chunk 2: Web Layout Integration

### Task 4: Add app-layer route-aware state for default-open behavior

**Files:**
- Create: `apps/web/app/components/command-center/use-command-center-state.ts`
- Create: `apps/web/app/components/command-center/web-command-center.test.tsx`
- Modify: `apps/web/app/routes/layout.tsx`

- [ ] **Step 1: Write the failing test**

Create tests that mount the app-layer wrapper in a router context and assert:
- `/home` starts open
- `/chat/123` starts closed
- `/notes/123` starts closed
- `/home` open preference persists between renders

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run --filter @hominem/web test -- app/components/command-center/web-command-center.test.tsx`
Expected: FAIL because the hook/component does not exist yet

- [ ] **Step 3: Write minimal implementation**

Create `use-command-center-state.ts` with:
- route-aware default-open logic
- `/home` persistence in browser storage
- session-scoped behavior for non-home routes
- close on `Esc`
- summon hotkey handler

Keep persistence rules exactly aligned with the approved spec.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run --filter @hominem/web test -- app/components/command-center/web-command-center.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

Run:
```bash
git add apps/web/app/components/command-center/use-command-center-state.ts apps/web/app/components/command-center/web-command-center.test.tsx apps/web/app/routes/layout.tsx
git commit -m "feat: add route-aware command center state"
```

### Task 5: Build the app-specific wrapper and route context adapter

**Files:**
- Create: `apps/web/app/components/command-center/web-command-center.tsx`
- Create: `apps/web/app/components/command-center/use-command-center-context.ts`
- Create: `apps/web/app/components/command-center/use-command-center-actions.ts`
- Modify: `apps/web/app/hooks/use-inbox-stream.ts`
- Modify: `apps/web/app/components/composer/use-composer-mode.ts`
- Test: `apps/web/app/components/command-center/web-command-center.test.tsx`

- [ ] **Step 1: Write the failing test**

Add tests for:
- global actions render on every route
- `/home` contextual section includes recent focus items
- note route renders note-aware context section label
- chat route renders chat-aware context section label

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run --filter @hominem/web test -- app/components/command-center/web-command-center.test.tsx`
Expected: FAIL because route adapters/actions are missing

- [ ] **Step 3: Write minimal implementation**

Create:
- `use-command-center-actions.ts` for universal items
- `use-command-center-context.ts` for route-specific sections
- `web-command-center.tsx` to bridge app data into the shared UI shell

Reuse:
- `useInboxStream()` for recent notes/chats
- route info from router and/or `use-composer-mode.ts`

Do not duplicate inbox mapping logic already in `use-inbox-stream.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run --filter @hominem/web test -- app/components/command-center/web-command-center.test.tsx`
Expected: PASS

- [ ] **Step 5: Typecheck the web app**

Run: `bun run --filter @hominem/web typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

Run:
```bash
git add apps/web/app/components/command-center/web-command-center.tsx apps/web/app/components/command-center/use-command-center-context.ts apps/web/app/components/command-center/use-command-center-actions.ts apps/web/app/components/command-center/use-command-center-state.ts apps/web/app/components/command-center/web-command-center.test.tsx apps/web/app/hooks/use-inbox-stream.ts apps/web/app/components/composer/use-composer-mode.ts
git commit -m "feat: add web command center wrapper and route context"
```

### Task 6: Replace the sidebar in the authenticated web shell

**Files:**
- Modify: `apps/web/app/routes/layout.tsx`
- Modify: `apps/web/app/routes/home-view.tsx`
- Modify or Delete: `apps/web/app/components/notes-sidebar.tsx`
- Modify: `packages/ui/src/components/layout/app-layout.tsx`
- Test: `apps/web/app/components/command-center/web-command-center.test.tsx`

- [ ] **Step 1: Write the failing test**

Add a test that verifies:
- the authenticated layout mounts the command center
- the layout no longer requires a sidebar prop to function
- `/home` still renders the authenticated shell correctly

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run --filter @hominem/web test -- app/components/command-center/web-command-center.test.tsx`
Expected: FAIL because the layout still depends on the old sidebar usage

- [ ] **Step 3: Write minimal implementation**

Change the shell so:
- `routes/layout.tsx` mounts the web command center instead of `NotesSidebar`
- `home-view.tsx` becomes the intended default open canvas for the command center
- `AppLayout` no longer assumes sidebar-driven composition for the web shell path

Do not leave the old sidebar half-mounted.

- [ ] **Step 4: Remove dead sidebar code**

Delete or fully detach `apps/web/app/components/notes-sidebar.tsx` once nothing imports it.

- [ ] **Step 5: Run tests and typecheck**

Run:
```bash
bun run --filter @hominem/web test
bun run --filter @hominem/web typecheck
bun run --filter @hominem/ui test
bun run --filter @hominem/ui typecheck
```
Expected: PASS

- [ ] **Step 6: Commit**

Run:
```bash
git add apps/web/app/routes/layout.tsx apps/web/app/routes/home-view.tsx apps/web/app/components/notes-sidebar.tsx packages/ui/src/components/layout/app-layout.tsx
git commit -m "refactor: replace web sidebar shell with floating command center"
```

## Chunk 3: End-to-End Behavior and Cleanup

### Task 7: Add E2E coverage for summon, close, and home-default-open

**Files:**
- Modify: `apps/web/tests/assistant-lifecycle.spec.ts`
- Create or Modify: `apps/web/tests/command-center.spec.ts`

- [ ] **Step 1: Write the failing E2E test**

Add coverage for:
- `/home` shows the command center open by default after auth
- non-home route starts with the command center closed
- toggle opens it
- hotkey opens it
- `Esc` closes it

- [ ] **Step 2: Run the targeted E2E test to verify it fails**

Run: `bun run --filter @hominem/web test:e2e -- command-center.spec.ts`
Expected: FAIL because the feature is not fully wired or selectors are missing

- [ ] **Step 3: Write minimal implementation adjustments**

Add stable selectors or accessible labels only where necessary.

- [ ] **Step 4: Run the targeted E2E test to verify it passes**

Run: `bun run --filter @hominem/web test:e2e -- command-center.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

Run:
```bash
git add apps/web/tests/assistant-lifecycle.spec.ts apps/web/tests/command-center.spec.ts
git commit -m "test: cover floating command center interactions"
```

### Task 8: Final cleanup and verification

**Files:**
- Modify: any remaining imports/exports touched by the migration
- Verify: no stale sidebar references remain in active web shell files

- [ ] **Step 1: Search for stale sidebar usage**

Run:
```bash
rg -n "NotesSidebar|sidebar={<|useSidebar\\(|components/ui/sidebar" apps/web packages/ui -g '!**/build/**'
```
Expected: only intentional shared primitive references remain

- [ ] **Step 2: Remove dead references**

Delete or simplify any remaining web-sidebar-only code paths that are now obsolete.

- [ ] **Step 3: Run final verification**

Run:
```bash
bun run --filter @hominem/ui test
bun run --filter @hominem/ui typecheck
bun run --filter @hominem/web test
bun run --filter @hominem/web typecheck
```
Expected: PASS

- [ ] **Step 4: Commit**

Run:
```bash
git add packages/ui apps/web
git commit -m "chore: finalize floating command center migration"
```

## Notes for the Implementer

- Prefer replacing the old sidebar shell outright instead of keeping compatibility shims longer than necessary.
- Keep files small and focused. The app-layer wrapper should translate route/app data into the shared UI contract, not own panel internals.
- Follow TDD literally: write the failing test, run it, then implement the minimum code.
- Use GSAP for tasteful motion only. The command center should feel elegant, not theatrical.
- Do not introduce new data-fetching paths if `useInboxStream()` and existing route context can already supply the content.
