## 1. Canonical Thought Contract

- [x] 1.1 Define the canonical thought lifecycle information architecture shared by mobile and Notes
- [x] 1.2 Define the shared state machine, artifact model, relationship model, and supported action model

## 2. Parity Rules

- [x] 2.1 Define the parity matrix for what must match, what may differ, and what requires an explicit exception
- [x] 2.2 Define the documentation path for recording approved platform exceptions

## 3. Verification Foundation

- [x] 3.1 Define parity-focused contract and workflow test requirements for future feature changes
- [x] 3.2 Identify the canonical entry points and client adapters that later features must target on both surfaces

---

## Phase 2 — Pre-Implementation Decisions

Resolve and record each decision in `implementation-gaps.md` before Phase 3 begins.

- [x] D-001: Note only for v1; other three buttons rendered disabled with tooltip
- [x] D-002: End is silent, lands on HomeView, session stays resumable 30 days; abandon = same outcome
- [x] D-003: Max 3 cards, 30-day TTL, active = client-determined, zero-message sessions hidden
- [x] D-004: Always review — no threshold bypass; review is the ceremony, not the friction
- [x] D-005: `/home` is the Notes HomeView route; current `home.tsx` → `landing.tsx`

---

## Phase 3 — Shared Foundation Code

Complete before surface-specific work begins.

- [x] 3.1 Create shared `ThoughtLifecycleState` type and `isValidTransition` utility
      Target: `packages/chat/src/lifecycle-state.ts`
- [x] 3.2 Create shared `SessionSource`, `ArtifactType`, `ReviewItem`, `CaptureBarProps` types
- [x] 3.3 Create shared `ClassificationReviewProps` type and document classification API contract
      (what the endpoint receives, what it returns: `proposedType`, `proposedTitle`, `proposedChanges`)

---

## Phase 4 — Fix Broken Journeys

See `implementation-gaps.md` Section 2 for exact file paths and violation details.

- [x] B-001: Remove auto-create redirect from `apps/notes/app/routes/chat/index.tsx`
- [x] B-002: Replace `handleSaveAsNote` in `apps/notes/app/routes/chat/chat.$chatId.tsx`
      with canonical `classifying → reviewing_changes → persisting` flow
- [x] B-007: Add `CaptureBar` as first element in `apps/mobile/app/(protected)/(tabs)/focus/index.tsx`
- [x] B-008: Update signed-in redirect in `apps/notes/app/routes/home.tsx` to `HomeView`
- [x] B-009: Audit `withTiming` calls in mobile — align with `VOID_MOTION_ENTER`/`VOID_MOTION_EXIT`

---

## Phase 5 — Build Missing Components

See `implementation-gaps.md` Section 3 for prop contracts and platform targets.
See `ui-spec.md` for visual and interaction specs for each component.

- [x] N-002: Shared `ThoughtLifecycleState` machine package (prerequisite for all below)
- [x] N-005: `ClassificationReview` — web dialog + mobile bottom sheet
- [x] N-006: `ContextAnchor` — web component + mobile component
- [x] N-007: `ArtifactActions` — web component + mobile component
- [x] N-008: `CaptureBar` for Notes web (mount in layout shell per L-001/L-002)
- [x] N-003: `SessionCard` list on mobile `focus` (query chat list API)
- [x] N-001: Notes `HomeView` surface — new route, four regions per `home-contract.md`
- [x] N-004: `ProposalCard` list — query `reviewQueue`, render on both home surfaces
- [x] N-009: Empty states for each `HomeView` section (rules in `implementation-gaps.md` Section 3)

---

## Phase 6 — Wire ContextAnchor into Sessions

- [x] Add `source: SessionSource` to chat record API response
- [x] Pass source to `Chat` on mobile sherpa (fixes B-003)
- [x] Pass source to `ChatPage` on Notes chat (fixes B-004)
- [x] Render `ContextAnchor` in session header on both surfaces
- [ ] Update `ContextAnchor` after session produces an artifact
      → **Forwarded to `assistant-thought-lifecycle` task 3.2e** (requires classification + persist API)

---

## Phase 7 — Wire ArtifactActions into Sessions

- [x] Add `ArtifactActions` to mobile `chat.tsx` above `ChatInput` (fixes B-005)
- [x] Add `ArtifactActions` to Notes `chat.$chatId.tsx` above `ChatInput` (fixes B-006)
- [x] Connect `onTransform` → classification API → `ClassificationReview` on both surfaces (stubbed: classification API not yet implemented)
- [x] Connect reject → `idle` state on both surfaces
- [ ] Connect accept → persist API on both surfaces (blocked: classification API not yet implemented)
      → **Forwarded to `assistant-thought-lifecycle` tasks 3.2a–3.2d**

---

## Phase 8 — Shell Architecture

- [x] L-001/L-002: Mount `CaptureBar` in Notes `layout.tsx`, enforce visibility per route table
- [x] L-003: Update Notes `<Header />` to add `HomeView` as primary nav destination

---

## Phase 9 — Document Parity Exceptions

- [x] AX-001: Keyboard shortcuts — platform-required exception in `parity-exceptions.md`
- [x] AX-002: Session list browser asymmetry (Notes redirect vs. mobile)
- [x] AX-003: Note-seeded session entry mapping (`$noteId.chat.tsx` ↔ sherpa `seed` param)
- [x] AX-004: Mobile LocalStore `noteId` gap — `ContextAnchor` always `kind: 'new'` on mobile

---

## Phase 10 — Code Quality Fixes

Fix identified structural and correctness issues before verification.

- [x] FIX-001: Add `@hominem/chat-services/types` subpath export in `packages/chat/package.json`
      that re-exports only `lifecycle-state.ts`, `thought-types.ts`, and `contracts.ts` (no DB deps).
      Remove all local type mirrors from mobile chat components and import from the subpath instead.
      Target files: `artifact-actions.tsx`, `classification-review.tsx`, `context-anchor.tsx`, `chat.tsx`,
      `session-card.tsx`, `proposal-card.tsx` (mobile)

- [x] FIX-002: Fix broken enter animation in `apps/mobile/components/chat/classification-review.tsx`.
      Replace direct `.value` access in `Animated.View` style prop with `useAnimatedStyle` hook
      (Reanimated v2/v3 requirement — direct `.value` in style only reads the initial value).

- [x] FIX-003: Fix stale `messageCount` in Notes web `apps/notes/app/routes/chat/chat.$chatId.tsx`.
      Currently derived from the initial chat fetch (capped at 10, never updates during session).
      Replace with a live count sourced from the messages query so `ArtifactActions` appears
      after the first message is sent within the session.

- [x] FIX-004: Fix state machine shortcut in `handleTransform` stub on both surfaces.
      Currently jumps `idle → reviewing_changes` directly. Should pass through `classifying`
      (`idle → classifying → reviewing_changes`) so the `ArtifactActions` dim state is exercised.

- [x] FIX-005: Remove unused `messagesComponentRef` from `apps/notes/app/routes/chat/chat.$chatId.tsx`.

---

## Phase 11 — Verification

- [x] Contract tests: `ThoughtLifecycleState` transition rules
      `packages/chat/src/lifecycle-state.test.ts` — 20 tests, all pass
- [x] Contract tests: classification → review → persist on both surfaces
      `packages/chat/src/lifecycle-workflows.test.ts` — cross-surface parity suite, 19 tests, all pass
- [x] Workflow tests: all five journeys in `ui-spec.md` on both surfaces
      `packages/chat/src/lifecycle-workflows.test.ts` — each journey driven step by step
- [ ] End-to-end: mobile `focus → sherpa` critical path (Detox — deferred)
      → **Forwarded to `assistant-thought-lifecycle` task 4.2a**
- [ ] End-to-end: Notes `HomeView → chat.$chatId` critical path (Playwright — deferred)
      → **Forwarded to `assistant-thought-lifecycle` task 4.2b**
- [ ] Gate: no feature marked complete unless both surfaces pass
      → **Forwarded to `assistant-thought-lifecycle` task 4.2c**
