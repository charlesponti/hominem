# Composer Desktop Polish Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the web composer presentation so it feels calmer, clearer, and more intentional on desktop without changing behavior or leaving the design system.

**Architecture:** Keep all behavior in the existing composer container and resolver, and limit this pass to the presentational surface files in `apps/web/app/components/composer`. Improve internal hierarchy by tuning shell spacing, grouping, control states, and attachment/context presentation while preserving the current footprint and flow.

**Tech Stack:** React 19, Tailwind CSS, Vitest, Testing Library, Playwright, Bun, existing Hominem design tokens and utility classes.

---

## Chunk 1: Lock any semantic polish changes with focused tests

**Files:**
- Modify: `apps/web/app/components/composer/index.test.tsx`
- Reference: `docs/superpowers/specs/2026-03-20-composer-desktop-polish-design.md`

- [ ] **Step 1: Write the failing component assertions for the polished surface**

```tsx
it('keeps attachment and note-context groups visually distinct and tool controls accessible', () => {
  renderComposer({
    attachedNotes: [createNoteFixture()],
    uploadedFiles: [createUploadedFileFixture()],
  })

  expect(screen.getByText('brief.pdf')).toBeInTheDocument()
  expect(screen.getByText('Context')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Add attachment' })).toHaveAttribute('title', 'Add attachment')
})
```

- [ ] **Step 2: Run the focused composer test to confirm it fails**

Run:
`bun test --filter @hominem/web -- app/components/composer/index.test.tsx`

Expected: FAIL if the new semantics or structure hooks are not present yet.

- [ ] **Step 3: Add only the minimum test ids or labels needed**

Expose stable test hooks only where the polish pass needs them, without changing behavior.

- [ ] **Step 4: Re-run the focused composer test**

Run:
`bun test --filter @hominem/web -- app/components/composer/index.test.tsx`

Expected: still FAIL, but now against the desired polished output rather than missing selectors.

- [ ] **Step 5: Commit the polish test adjustments**

```bash
git add apps/web/app/components/composer/index.test.tsx
git commit -m "test(web): lock composer desktop polish semantics"
```

## Chunk 2: Refine shell spacing and layer hierarchy

**Files:**
- Modify: `apps/web/app/components/composer/composer-shell.tsx`
- Modify: `apps/web/app/components/composer/composer-attachment-list.tsx`
- Modify: `apps/web/app/components/composer/attached-notes-list.tsx`
- Test: `apps/web/app/components/composer/index.test.tsx`

- [ ] **Step 1: Add the failing structure assertion**

```tsx
it('renders the writing area, uploaded files, note context, and footer as separate visual bands', () => {
  renderComposerWithContent()
  expect(screen.getByTestId('composer-input')).toBeInTheDocument()
  expect(screen.getByTestId('composer-attachments')).toBeInTheDocument()
  expect(screen.getByTestId('composer-note-context')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the focused test**

Run:
`bun test --filter @hominem/web -- app/components/composer/index.test.tsx`

Expected: FAIL because the current surface does not expose the refined grouping yet.

- [ ] **Step 3: Implement the shell hierarchy polish**

Tune:

- shell padding and internal spacing cadence
- separation between textarea and secondary bands
- quieter footer rail alignment
- calmer card surface treatment inside the existing visual language

- [ ] **Step 4: Refine uploaded-file and note-context presentation**

Use small, controlled improvements:

- clearer chip density
- slightly stronger grouping
- more deliberate remove affordances
- softer visual weight than the main textarea

- [ ] **Step 5: Run the focused component tests**

Run:
`bun test --filter @hominem/web -- app/components/composer/index.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit the shell and hierarchy polish**

```bash
git add apps/web/app/components/composer/composer-shell.tsx apps/web/app/components/composer/composer-attachment-list.tsx apps/web/app/components/composer/attached-notes-list.tsx apps/web/app/components/composer/index.test.tsx
git commit -m "style(web): refine composer shell hierarchy"
```

## Chunk 3: Polish tool and action states

**Files:**
- Modify: `apps/web/app/components/composer/composer-tools.tsx`
- Modify: `apps/web/app/components/composer/composer-actions-row.tsx`
- Test: `apps/web/app/components/composer/index.test.tsx`

- [ ] **Step 1: Add the failing control-state assertion**

```tsx
it('gives tools and actions clearer hover, focus, active, and disabled state semantics', () => {
  renderComposer()
  expect(screen.getByTestId('composer-primary')).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Voice note' })).toHaveAttribute('aria-label', 'Voice note')
})
```

- [ ] **Step 2: Run the focused test**

Run:
`bun test --filter @hominem/web -- app/components/composer/index.test.tsx`

Expected: FAIL if the polished control-state semantics are not reflected yet.

- [ ] **Step 3: Implement the control-state polish**

Tune:

- quieter default tool appearance
- stronger active state for context and recording tools
- more balanced secondary/primary pairing
- cleaner disabled treatment that still feels deliberate
- coherent focus-visible treatment across controls

- [ ] **Step 4: Run the focused component tests**

Run:
`bun test --filter @hominem/web -- app/components/composer/index.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the control-state polish**

```bash
git add apps/web/app/components/composer/composer-tools.tsx apps/web/app/components/composer/composer-actions-row.tsx apps/web/app/components/composer/index.test.tsx
git commit -m "style(web): polish composer controls"
```

## Chunk 4: Run final verification without changing behavior

**Files:**
- Modify: `apps/web/tests/assistant-lifecycle.spec.ts`
- Modify: `apps/web/tests/chat-ui.spec.ts`
- Only if needed for label or semantic changes

- [ ] **Step 1: Update browser assertions only if the polish changed visible semantics**

Keep changes minimal and limited to labels or selectors if necessary.

- [ ] **Step 2: Run the web component tests**

Run:
`bun run --filter @hominem/web test`

Expected: PASS.

- [ ] **Step 3: Run web typecheck and browser coverage**

Run:
`bun run --filter @hominem/web typecheck`
`bun run --filter @hominem/web test:e2e -- tests/assistant-lifecycle.spec.ts tests/chat-ui.spec.ts`

Expected: PASS.

- [ ] **Step 4: Run the repo safety check**

Run:
`bun run check`

Expected: PASS.

- [ ] **Step 5: Commit the desktop polish pass**

```bash
git add apps/web/app/components/composer apps/web/tests/assistant-lifecycle.spec.ts apps/web/tests/chat-ui.spec.ts docs/superpowers/specs/2026-03-20-composer-desktop-polish-design.md docs/superpowers/plans/2026-03-20-composer-desktop-polish.md
git commit -m "style(web): polish composer for desktop"
```
