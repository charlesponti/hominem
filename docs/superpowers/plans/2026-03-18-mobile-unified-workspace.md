# Mobile Unified Workspace Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fragmented mobile notes/chat flow with one shared workspace shell, a unified chronological inbox, and a single context-aware HyperForm.

**Architecture:** The protected Expo Router layout becomes the long-lived owner of workspace context and draft state. `Inbox`, `Note`, `Chat`, `Search`, and `Settings` render as contexts of the same workspace, while one shell-mounted HyperForm replaces route-local capture and chat inputs and reuses existing mobile service hooks.

**Tech Stack:** Expo Router, React Native, React Query, existing mobile service hooks, shared UI tokens/theme

---

## Chunk 1: Shell and shared state

### Task 1: Introduce mobile workspace context ownership

**Files:**
- Modify: `apps/mobile/app/(protected)/_layout.tsx`
- Modify: `apps/mobile/app/(protected)/(tabs)/_layout.tsx`
- Create: `apps/mobile/components/workspace/mobile-workspace-context.tsx`
- Test: `apps/mobile/tests/routes/mobile-workspace-shell.test.tsx`

- [ ] **Step 1: Write the failing shell test**

Add a route test that expects the protected mobile shell to expose `Inbox`, `Note`, `Chat`, `Search`, and `Settings` as workspace contexts with `Inbox` selected by default.

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `bun run test --filter mobile-workspace-shell`
Expected: FAIL because the shared workspace shell/context switcher does not exist yet.

- [ ] **Step 3: Implement the workspace context provider**

Create a focused provider that stores the active workspace context plus optional selected note/chat identifiers and exposes read/update hooks for shell consumers.

- [ ] **Step 4: Refactor the protected layout to mount the provider**

Wrap the protected mobile stack in the new provider and add a shell-level mount point for the shared header/composer.

- [ ] **Step 5: Replace the tabs layout with a top context switcher**

Refactor the current `NativeTabs` destination model so the primary navigation is a sticky top context switcher instead of bottom-first product tabs.

- [ ] **Step 6: Run the targeted test to verify it passes**

Run: `bun run test --filter mobile-workspace-shell`
Expected: PASS with `Inbox` as the default active context.

### Task 2: Expand shared input state into a HyperForm draft contract

**Files:**
- Modify: `apps/mobile/components/input/input-context.tsx`
- Create: `apps/mobile/components/input/mobile-hyper-form-state.ts`
- Test: `apps/mobile/tests/components/mobile-hyper-form-state.test.tsx`

- [ ] **Step 1: Write the failing state-contract test**

Add a test that expects the shared input state to preserve text, staged attachments, recording state, and active context metadata across updates.

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `bun run test --filter mobile-hyper-form-state`
Expected: FAIL because the current context only stores `message`, `mode`, and recording state.

- [ ] **Step 3: Define the draft contract type**

Create a focused type/module for HyperForm draft state with no duplication between note and chat paths.

- [ ] **Step 4: Update the input provider to own the new contract**

Replace narrow message-only state with the richer shared draft state and focused setter helpers.

- [ ] **Step 5: Run the targeted test to verify it passes**

Run: `bun run test --filter mobile-hyper-form-state`
Expected: PASS with draft persistence semantics enforced.

## Chunk 2: HyperForm and focused surfaces

### Task 3: Build the shell-mounted mobile HyperForm

**Files:**
- Create: `apps/mobile/components/input/mobile-hyper-form.tsx`
- Modify: `apps/mobile/app/(protected)/_layout.tsx`
- Modify: `apps/mobile/components/chat/chat-input.tsx`
- Modify: `apps/mobile/components/input/input-dock.tsx`
- Modify: `apps/mobile/components/capture/capture-bar.tsx`
- Test: `apps/mobile/tests/components/mobile-hyper-form.test.tsx`

- [ ] **Step 1: Write the failing HyperForm behavior test**

Add a component test that expects one HyperForm instance to remain mounted while placeholder text and actions change between `Inbox`, `Note`, `Chat`, and `Search` contexts.

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `bun run test --filter mobile-hyper-form`
Expected: FAIL because no shell-mounted HyperForm exists.

- [ ] **Step 3: Implement the HyperForm UI and context-aware behavior**

Build the single surface with compact chat posture, drafting-first note posture, inbox capture posture, and query-first search posture, reusing existing voice and attachment flows.

- [ ] **Step 4: Mount the HyperForm once in the shell**

Attach the component at the protected layout level so it survives context switches and focused route changes.

- [ ] **Step 5: Strip route-local input ownership**

Reduce `chat-input`, `input-dock`, and `capture-bar` to wrappers, adapters, or retired components so they no longer own active draft state.

- [ ] **Step 6: Run the targeted test to verify it passes**

Run: `bun run test --filter mobile-hyper-form`
Expected: PASS with one persistent HyperForm instance.

### Task 4: Convert mobile home into the unified Inbox stream

**Files:**
- Modify: `apps/mobile/app/(protected)/(tabs)/focus/index.tsx`
- Create: `apps/mobile/components/workspace/inbox-stream.tsx`
- Create: `apps/mobile/components/workspace/inbox-stream-item.tsx`
- Test: `apps/mobile/tests/screens/mobile-inbox.test.tsx`

- [ ] **Step 1: Write the failing inbox test**

Add a screen test that expects `Inbox` to render a mixed chronological stream and update when note/chat actions succeed.

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `bun run test --filter mobile-inbox`
Expected: FAIL because the current focus screen is sectioned and not a unified stream.

- [ ] **Step 3: Define the stream item adapter**

Create a typed adapter that maps notes, chat activity, assistant output, and attachments into one render model.

- [ ] **Step 4: Implement the inbox stream surface**

Replace segmented `Capture` and `SessionList` sections with the unified stream while preserving existing data sources where possible.

- [ ] **Step 5: Wire optimistic refresh behavior**

Ensure note creation and chat activity update the inbox view immediately through React Query invalidation or optimistic cache updates.

- [ ] **Step 6: Run the targeted test to verify it passes**

Run: `bun run test --filter mobile-inbox`
Expected: PASS with new content visible in recency order.

## Chunk 3: Focused note/chat/search contexts and retirement

### Task 5: Reframe chat as a focused workspace context

**Files:**
- Modify: `apps/mobile/app/(protected)/(tabs)/sherpa/index.tsx`
- Modify: `apps/mobile/components/chat/chat.tsx`
- Test: `apps/mobile/tests/screens/mobile-chat-context.test.tsx`

- [ ] **Step 1: Write the failing chat-context test**

Add a screen test that expects chat to render as a focused workspace context while using the shell-owned HyperForm for replies.

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `bun run test --filter mobile-chat-context`
Expected: FAIL because chat still owns route-local input behavior.

- [ ] **Step 3: Remove local composer ownership from chat**

Keep `chat.tsx` focused on transcript rendering, search, and secondary actions, with reply behavior delegated to the shell HyperForm.

- [ ] **Step 4: Align the chat route with workspace context state**

Make `sherpa/index.tsx` resolve route state into the shared workspace context rather than behaving as a separate product destination.

- [ ] **Step 5: Run the targeted test to verify it passes**

Run: `bun run test --filter mobile-chat-context`
Expected: PASS with chat rendered as a focused context of the same workspace.

### Task 6: Add note/search contexts and retire obsolete surfaces

**Files:**
- Create: `apps/mobile/components/workspace/note-context-screen.tsx`
- Create: `apps/mobile/components/workspace/search-context-screen.tsx`
- Modify: `apps/mobile/app/(protected)/(tabs)/start/index.tsx`
- Modify: `apps/mobile/e2e/assistant-lifecycle.mobile.e2e.js`
- Test: `apps/mobile/tests/screens/mobile-workspace-contexts.test.tsx`

- [ ] **Step 1: Write the failing workspace-contexts test**

Add tests that expect note and search contexts to be reachable from the shared shell and that settings minimize or hide the HyperForm.

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `bun run test --filter mobile-workspace-contexts`
Expected: FAIL because note/search are not modeled as shared workspace contexts.

- [ ] **Step 3: Implement focused note and search context screens**

Add lightweight, focused screens that reuse the shared shell/header/composer contract.

- [ ] **Step 4: Fold or retire the old start surface**

Move useful entry prompts into inbox empty states or quick actions and remove `start` as a primary product destination.

- [ ] **Step 5: Update end-to-end expectations**

Rewrite the mobile lifecycle flow around Inbox, shared HyperForm behavior, and context switching.

- [ ] **Step 6: Run the targeted tests to verify they pass**

Run: `bun run test --filter mobile-workspace-contexts`
Expected: PASS with the new context model enforced.

## Chunk 4: Spec alignment and completion

### Task 7: Keep specs and docs aligned with implementation

**Files:**
- Modify: `openspec/ACTIVE_CHANGE.md`
- Modify: `openspec/specs/universal-composer/spec.md`
- Modify: `docs/notes-app-layout-plan.md`

- [ ] **Step 1: Activate the change before implementation proceeds**

Set `openspec/ACTIVE_CHANGE.md` to `mobile-unified-workspace` with the matching artifact list so implementation stays within one declared change.

- [ ] **Step 2: Mirror any implementation-driven requirement refinements back into canonical specs/docs**

Keep the universal composer and mobile workspace documentation synchronized with the behavior actually shipped.

- [ ] **Step 3: Run the project-level safety check**

Run: `bun run check`
Expected: PASS with no new type, lint, or validation regressions.
