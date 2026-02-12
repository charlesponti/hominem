---
title: feat AI-first Notes Workspace
type: feat
date: 2026-02-10
---

# AI-first Notes Workspace (Workspace Overhaul)

🔧 **Overview**

Transform the Notes app into an **AI-first workspace** where capture is minimal and discovery, action, and AI-powered transformations are central. The workspace places the assistant at the forefront (sticky bottom center) while surfacing a compact, high-information notes feed, task summary, goals, and events — designed for fast scanning and AI-assisted operations (expand, outline, rewrite, summarize, bulk actions).

---

## Goals ✅

- Ship a single Workspace surface that keeps the AI assistant front-and-center while letting users capture, search, and act on notes quickly.
- Reduce friction for capture: title is optional during creation and becomes metadata on edit.
- Provide AI-first actions on notes (Expand, Outline, Rewrite, Summarize, Apply suggestion) and support bulk operations.
- Preserve existing pages (`/notes`, `/tasks`, `/goals`, `/events`) — Workspace is additive and can be promoted later.
- Keep APIs secure and follow repository rules (apps use RPC client; no DB access from apps).

---

## Non-goals ❌

- Replacing the assistant/chat engine or changing backend model selection (that belongs to services/api).
- Large data-model changes without a companion migration plan (we will extend types where necessary and update RPC types accordingly).

---

## Success Metrics 📏

- Workspace load renders in < 2s on a cold load for signed-in users.
- 20% increase in notes created per active user in the first 30 days (capture friction reduced).
- >80% accuracy in AI-suggested edits being accepted or modified by users in A/B tests.
- No database import violations in apps (passes `bun run validate-db-imports`).

---

## High-Level User Flow

1. User navigates to `/workspace` (header nav: **Workspace**).
2. Left column: AI Assistant (chat) — always visible and context-aware.
3. Right column: compact panels showing Notes (create + feed), Tasks (top 3), Goals (top 2), Events (next 4).
4. Users create a note with a single content field; title is not shown by default. Cmd/Ctrl+T toggles title input for power users.
5. Each note item supports expansion to reveal metadata, tags, versions, and AI actions.
6. AI actions are implemented as prompts sent to the chat endpoint; results can be persisted to the note via a server-side mutation after user confirmation.

---

## Design & UX ✨

- Follow VOID design rules (monochrome, monospace, crosshair cursor, instantaneous interactions) as per `.github/instructions/design.instructions.md`.
- Notes list: dense, high-contrast, left aligned, **title only displayed after creation or via expand**.
- Inline create: single line content with placeholder. On focus, expand to a small composer; title hidden by default.
- Note item (collapsed): first line preview, tags, small date. Expanded: full content, metadata, AI action buttons, version selector.
- Keyboard-first: search input, up/down navigation, Cmd/Ctrl+Enter to submit, Cmd/Ctrl+T to toggle title in composer, `Shift` selection for multi-select.

Design reference: See screenshot (owner-provided) for the compact, information-dense list layout.

---

## Architecture & Implementation Plan (Phased)

### Phase 1 — Foundation (small, <1 week) ✅
- Add `/workspace` route and header nav entry. (Done: `apps/notes/app/routes/workspace.tsx`, nav in `header.tsx`.)
- Create `useEventsList` hook for event summary (Done: `apps/notes/app/hooks/use-events.ts`).
- Update `InlineCreateForm` so title is only visible on edit; add a showTitle toggle state for power users (Done: `apps/notes/app/routes/notes/components/inline-create-form.tsx`).
- Basic acceptance tests: render of new route and fetches succeed.

### Phase 2 — Enhanced Notes List + Actions (2–3 weeks)
- Implement `EnhancedNoteItem` component with:
  - collapsed preview and full expansion
  - metadata (createdAt, updatedAt, version label)
  - tags & removal
  - AI action buttons wired to chat (Expand/Outline/Rewrite/Summarize)
  - optimistic UI patterns for note updates
- Implement `WorkspaceNotesPanel` with search and filters, powered by existing `useNotesList` but extended for server-side filtering (query params via RPC).
- Keyboard navigation, selection, and bulk actions hooks.

### Phase 3 — AI Action Integration (2 weeks)
- Wire AI actions through `useSendMessage` so actions appear in the chat stream; design a lightweight server-side mutation to optionally persist AI results (e.g., `POST /notes/:id/apply-ai-result` with diff or new content).
- Add confirmation UX: preview AI result inline with `Apply` and `Discard` options.
- Add instrumentation events (analytics) for AI actions (trigger, apply, discard).

### Phase 4 — Bulk & Workflow (1–2 weeks)
- Multi-select notes, run bulk actions (summarize multiple notes, generate task list from selection).
- Add export/share (e.g., copy summary to clipboard or export to file).

### Phase 5 — Polish, Accessibility, Testing (1–2 weeks)
- Add unit tests for hooks and components (React Testing Library, vitest as per repo conventions).
- E2E flows for workspace capture and AI apply (Playwright / app integration harness used in repo).
- Accessibility audit, keyboard-only flows, ARIA labels.

---

## API / Backend Considerations

- Keep server-side changes minimal and safe via the RPC layer.
- Add endpoints only in the Hono RPC layer (services/api) and expose typed rpc types in `@hominem/hono-rpc/types`:
  - `POST /notes/:id/apply-ai-result` (accepts suggested content and diff info; applies update and returns note)
  - Optionally: `POST /notes/bulk-apply` for bulk operations
- AI transformation work stays in the assistant/chat service (chat sends the prompt, returns streaming result); persisting is a separate confirm step.
- Continue to obey database access rules: apps must use RPC endpoints.

---

## Data Model & Types

- Note structure remains mostly the same (see `@hominem/hono-rpc/types/notes.types`).
- Add small optional fields if helpful:
  - aiSummary?: string
  - aiVariants?: Array<{ id: string; type: string; content: string; createdAt: string }>
  - versionNumber / parentNoteId usage is already present—leverage it for AI-based versions
- Update RPC types and add Zod validations in `packages/hono-rpc` when introducing new endpoints.

---

## Testing & Quality

- Unit tests for:
  - `EnhancedNoteItem` interactions and button wiring
  - `InlineCreateForm` behaviors (title toggle, empty-content block)
  - Hooks: `useNotesList`, `useEventsList`, `useSendMessage` optimistic behaviors
- Integration tests:
  - Workspace route loads and shows assistant + panels
  - AI action: chat stream shows result and application persists when confirmed
- E2E: create note -> trigger Expand -> preview -> Apply -> note updated

---

## Rollout Plan

- Canary rollout to 5% of users behind feature flag (use `FeatureFlagsProvider`) and gather telemetry (action rates, errors, performance).
- Iterate UI/UX based on early metrics and bug reports.
- Gradual increase to all users once stable.

---

## Acceptance Criteria ✅

- [ ] `/workspace` route exists and is accessible from header for authenticated users.
- [ ] Creator experience: create a note with single content field; saved note appears in feed, title is not required.
- [ ] Editor experience: editing shows title input and allows updating title/contents/tags.
- [ ] AI actions send prompts to chat and streaming result is visible in the assistant panel.
- [ ] User can preview an AI-suggested change and choose to persist it to the note.
- [ ] Accessibility and keyboard navigation works per UX specs.
- [ ] Tests cover the flows and CI passes.

---

## Risks & Mitigations ⚠️

- Risk: Heavy chat streaming activity might generate load spikes. Mitigate: rate-limit actions per user and debounce bulk requests; use server-side queue for heavy transformations.
- Risk: Users may lose trust if AI edits change tone/meaning. Mitigate: always require explicit user confirmation before persisting AI results and show diffs.
- Risk: Feature flag/partial rollout complexity. Mitigate: implement feature flags and server-side toggles early.

---

## Files & Components to Create/Modify (quick map)

- New: `apps/notes/app/routes/workspace.tsx` (command center) — (started).
- New: `apps/notes/app/components/notes/enhanced-note-item.tsx` (collapsible, metadata, AI actions).
- New: `apps/notes/app/components/workspace/workspace-notes-panel.tsx` (search, filters, list).
- Modify: `apps/notes/app/routes/notes/components/inline-create-form.tsx` (title toggling; create vs edit differences) — (started).
- Modify: `apps/notes/app/components/header.tsx` (workspace nav entry) — (done).
- New Hook: `apps/notes/app/hooks/use-events.ts` — (done).
- RPC: Add `notes.applyAiResult` endpoint and associated types in `packages/hono-rpc`.

---

## Timeline & Estimates (rough)

- Phase 1: Foundation — 3 days
- Phase 2: Enhanced list & actions — 2–3 weeks
- Phase 3: AI integration & persistence — 2 weeks
- Phase 4: Bulk & workflow — 1–2 weeks
- Phase 5: Polish & tests — 1–2 weeks

Total: ~6–10 weeks to full polish depending on iteration and QA cycles.

---

## Related Work & References

- Existing notes pages and components: `apps/notes/app/routes/notes/page.tsx`, `InlineCreateForm`, `NoteFeedItem`.
- Chat integration: `apps/notes/app/components/chat/*` and `useSendMessage` hook.
- Design guide: `.github/instructions/design.instructions.md` (VOID rules).

---

## Next Steps

- Agree on scope & acceptance criteria.
- Create tickets for Phase 2 items (design, components, AI action wiring) and assign owners.
- Implement feature flags and a minimal `notes.applyAiResult` RPC route to accept and validate suggested content.

---

Please review and tell me which parts you want prioritized (AI action persistence, bulk operations, keyboard-first navigation, or accessibility/testing). I can open the tickets and start Phase 2 implementation next.