# Note Editing Sheet Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the mobile note editor into a balanced two-tier sheet that keeps the note body dominant while making metadata and save actions feel intentional.

**Architecture:** Extract the sheet surface into a dedicated focus component so the route stays small and the editor UI stays easy to reason about. Keep data loading and save mutation in the route, and keep the sheet component responsible for presentation, local editor state, and due-date interaction. Protect the layout with a focused screen test so the note body, metadata area, and save footer stay in the right order.

**Tech Stack:** Expo Router, React Native, React Query, existing mobile theme primitives, `react-test-renderer`, Vitest.

---

## Chunk 1: Extract the balanced sheet surface

**Files:**
- Create: `apps/mobile/components/focus/note-editing-sheet.tsx`
- Modify: `apps/mobile/app/(protected)/(tabs)/focus/[id].tsx`
- Test: `apps/mobile/tests/screens/focus-note-editing-sheet.test.tsx`

- [ ] **Step 1: Write the failing screen test**

```tsx
it('renders the note sheet with a compact header, dominant editor, metadata card, and save footer', async () => {
  // render the route or extracted sheet with a note fixture
  // assert the header copy, note field, due-date area, and save button appear in that order
})
```

- [ ] **Step 2: Run the focused test to confirm it fails**

Run: `bunx vitest run --config vitest.config.ts tests/screens/focus-note-editing-sheet.test.tsx`
Expected: FAIL because the extracted sheet component does not exist yet.

- [ ] **Step 3: Implement the minimal sheet extraction**

```tsx
export function NoteEditingSheet({
  note,
  text,
  setText,
  scheduledFor,
  onScheduledForChange,
  onSave,
}: Props) {
  // header, editor card, metadata card, footer
}
```

Update `apps/mobile/app/(protected)/(tabs)/focus/[id].tsx` so it resolves the note, owns the save mutation, and passes only the sheet state and handlers into the new component.

- [ ] **Step 4: Run the focused test to confirm it passes**

Run: `bunx vitest run --config vitest.config.ts tests/screens/focus-note-editing-sheet.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit the extraction**

```bash
git add apps/mobile/components/focus/note-editing-sheet.tsx apps/mobile/app/'(protected)'/'(tabs)'/focus/'[id]'.tsx apps/mobile/tests/screens/focus-note-editing-sheet.test.tsx
git commit -m "feat(mobile): extract note editing sheet"
```

## Chunk 2: Polish interactions and verify the route

**Files:**
- Modify: `apps/mobile/components/focus/note-editing-sheet.tsx`
- Modify: `apps/mobile/tests/screens/focus-note-editing-sheet.test.tsx`

- [ ] **Step 1: Write the failing interaction test**

```tsx
it('keeps due date editable and save reachable from the footer', async () => {
  // assert the due-date control has a real tap target and save remains visible
})
```

- [ ] **Step 2: Run the focused test to confirm it fails**

Run: `bunx vitest run --config vitest.config.ts tests/screens/focus-note-editing-sheet.test.tsx`
Expected: FAIL because the interaction affordance is not yet implemented.

- [ ] **Step 3: Implement the metadata control and footer behavior**

Keep the due-date control explicit and accessible, preserve the note-body-first hierarchy, and ensure the save action remains the primary footer action without growing the sheet into a generic form.

- [ ] **Step 4: Run the focused test and mobile typecheck**

Run:
`bunx vitest run --config vitest.config.ts tests/screens/focus-note-editing-sheet.test.tsx`
`bunx tsc -p apps/mobile/tsconfig.json --noEmit`

Expected: both pass.

- [ ] **Step 5: Commit the polish pass**

```bash
git add apps/mobile/components/focus/note-editing-sheet.tsx apps/mobile/tests/screens/focus-note-editing-sheet.test.tsx
git commit -m "feat(mobile): polish note editing sheet"
```

## Final Verification

**Files:**
- No code changes

- [ ] **Step 1: Run the targeted mobile tests**

Run:
`bunx vitest run --config vitest.config.ts tests/screens/focus-note-editing-sheet.test.tsx tests/screens/mobile-chat-context.test.tsx`

Expected: pass.

- [ ] **Step 2: Run the mobile typecheck**

Run:
`bunx tsc -p apps/mobile/tsconfig.json --noEmit`

Expected: pass.

