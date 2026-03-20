# Focus List Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one minimal, native-feeling grouped list system for notes and chats across mobile and web using a shared row primitive: tiny leading icon, strong title, one metadata line, no default snippet, and no row cards.

**Architecture:** Keep the merged inbox data model intact and refactor presentation from the design-system outward. First codify grouped-list tokens in `packages/ui`, then apply the same grouped surface and row hierarchy to mobile and web list surfaces so notes and chats share one visual system.

**Tech Stack:** Bun, React, React Native, Expo Router, React Router, FlashList, Vitest, Testing Library, `@hominem/ui` tokens

---

## File Map

- Modify: `packages/ui/src/tokens/notes.ts`
  Purpose: define grouped page/surface contrast, panel radius, divider inset, row spacing, and icon sizing.
- Modify: `packages/ui/src/tokens/notes.test.ts`
  Purpose: lock the shared grouped-list token contract.
- Modify: `apps/mobile/app/(protected)/(tabs)/focus/index.tsx`
  Purpose: give the focus screen the softer grouped-list page background.
- Modify: `apps/mobile/components/workspace/inbox-stream.tsx`
  Purpose: render the mobile list inside grouped containers instead of standalone row cards.
- Modify: `apps/mobile/components/workspace/inbox-stream-item.tsx`
  Purpose: implement the shared row primitive with icon, title, and one metadata line.
- Modify: `apps/mobile/components/workspace/inbox-stream-items.ts`
  Purpose: preserve the no-snippet default and shared note/chat model.
- Modify: `apps/mobile/tests/components/mobile-inbox-stream-item.test.tsx`
  Purpose: guard the row against extra type cues and extra text lines.
- Modify: `apps/mobile/tests/components/mobile-inbox-stream-items.test.ts`
  Purpose: preserve preview-null and shared note/chat defaults.
- Modify: `apps/web/app/hooks/use-inbox-stream.ts`
  Purpose: keep the web item model aligned with the mobile primitive.
- Modify: `apps/web/app/hooks/use-inbox-stream.test.tsx`
  Purpose: preserve nullable preview and aligned fallback titles.
- Modify: `apps/web/app/components/notes-sidebar.tsx`
  Purpose: apply the same grouped-list shell and row primitive on web.
- Modify: `apps/web/app/components/notes-sidebar.test.tsx`
  Purpose: verify grouped shell, shared row structure, and no extra source words.

## Chunk 1: Design-System Contract

### Task 1: Codify grouped-native list tokens

**Files:**
- Modify: `packages/ui/src/tokens/notes.ts`
- Modify: `packages/ui/src/tokens/notes.test.ts`

- [ ] **Step 1: Write the failing token assertions**

Use or extend `packages/ui/src/tokens/notes.test.ts` so it proves:

```ts
expect(notesTokens.surfaces.page).not.toBe(notesTokens.surfaces.panel)
expect(notesTokens.radii.panel).toBeGreaterThan(8)
expect(notesTokens.stream.itemGap).toBe(0)
expect(notesTokens.stream.typeIconSize).toBe(14)
expect(notesTokens.spacing.feedItemPaddingY).toBe(spacing[4])
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run --root packages/ui --config vitest.config.ts src/tokens/notes.test.ts`

Expected: FAIL until grouped page/surface contrast and panel radius are represented.

- [ ] **Step 3: Write the minimal token changes**

Update `packages/ui/src/tokens/notes.ts` to support the grouped-native list:

- softer page background than grouped surface
- grouped panel radius larger than the default control radius
- zero row gap
- tiny leading icon size
- divider inset token
- grouped outer spacing token if needed

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run --root packages/ui --config vitest.config.ts src/tokens/notes.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/tokens/notes.ts packages/ui/src/tokens/notes.test.ts
git commit -m "refactor(ui): define grouped native list tokens"
```

### Task 2: Preserve the shared row data contract

**Files:**
- Modify: `apps/mobile/components/workspace/inbox-stream-items.ts`
- Modify: `apps/mobile/tests/components/mobile-inbox-stream-items.test.ts`
- Modify: `apps/web/app/hooks/use-inbox-stream.ts`
- Modify: `apps/web/app/hooks/use-inbox-stream.test.tsx`

- [ ] **Step 1: Write the failing model assertions**

Make sure the focused tests prove:

```ts
expect(item.preview).toBeNull()
expect(chatItem.title).toBe('Untitled session')
```

- [ ] **Step 2: Run tests to verify they fail if the contract drifts**

Run: `bunx vitest run --root apps/mobile --config vitest.config.ts tests/components/mobile-inbox-stream-items.test.ts`

Run: `bunx vitest run --root apps/web --config vitest.config.ts app/hooks/use-inbox-stream.test.tsx`

Expected: FAIL if preview text or mismatched fallback titles reappear.

- [ ] **Step 3: Write the minimal shared-model implementation**

Keep:

- `preview: string | null`
- no manufactured snippet by default
- aligned note/chat fallback titles

- [ ] **Step 4: Run tests to verify they pass**

Run: `bunx vitest run --root apps/mobile --config vitest.config.ts tests/components/mobile-inbox-stream-items.test.ts`

Run: `bunx vitest run --root apps/web --config vitest.config.ts app/hooks/use-inbox-stream.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/components/workspace/inbox-stream-items.ts apps/mobile/tests/components/mobile-inbox-stream-items.test.ts apps/web/app/hooks/use-inbox-stream.ts apps/web/app/hooks/use-inbox-stream.test.tsx
git commit -m "refactor(inbox): preserve shared list item contract"
```

## Chunk 2: Mobile Grouped List

### Task 3: Build the minimal-native mobile row primitive

**Files:**
- Modify: `apps/mobile/components/workspace/inbox-stream-item.tsx`
- Modify: `apps/mobile/tests/components/mobile-inbox-stream-item.test.tsx`

- [ ] **Step 1: Write the failing row-contract test**

Use `apps/mobile/tests/components/mobile-inbox-stream-item.test.tsx` to enforce:

```ts
expect(source).toContain('formatTimestamp(item.timestamp)')
expect(source).not.toContain('sourceLabel')
expect(source).not.toContain("'Notes'")
expect(source).not.toContain("'Chats'")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run --root apps/mobile --config vitest.config.ts tests/components/mobile-inbox-stream-item.test.tsx`

Expected: FAIL until the row contains only icon, title, and one metadata line.

- [ ] **Step 3: Write the minimal row implementation**

Update `apps/mobile/components/workspace/inbox-stream-item.tsx` so the row uses:

- one tiny leading icon
- one single-line title
- one single-line metadata line
- optional preview only when explicitly available later
- no source words
- no trailing timestamp column

Target structure:

```tsx
<Pressable style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}>
  <View style={styles.leading}>
    <AppIcon ... />
  </View>
  <View style={styles.content}>
    <Text style={styles.title}>{item.title}</Text>
    <Text style={styles.metadata}>{formatTimestamp(item.timestamp)}</Text>
  </View>
</Pressable>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run --root apps/mobile --config vitest.config.ts tests/components/mobile-inbox-stream-item.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/components/workspace/inbox-stream-item.tsx apps/mobile/tests/components/mobile-inbox-stream-item.test.tsx
git commit -m "refactor(mobile): simplify grouped list rows"
```

### Task 4: Build the grouped mobile surface

**Files:**
- Modify: `apps/mobile/app/(protected)/(tabs)/focus/index.tsx`
- Modify: `apps/mobile/components/workspace/inbox-stream.tsx`

- [ ] **Step 1: Write the failing grouped-surface test or source assertion**

Use a focused source or component assertion proving:

- page background uses the softer grouped-list page tone
- grouped container exists
- rows are separated by inset dividers
- there is no row-card treatment

- [ ] **Step 2: Run test to verify it fails**

Run the focused mobile test file that covers the grouped-shell structure.

Expected: FAIL until the container hierarchy matches grouped-native list behavior.

- [ ] **Step 3: Write the minimal surface implementation**

Update:

- `focus/index.tsx` to use the grouped-list page background
- `inbox-stream.tsx` to wrap rows in a rounded shell with inset dividers
- empty state to use the same calmer grouped surface language

Rules:

- no per-item cards
- no loud section chrome
- no unnecessary headings unless the product truly needs them

- [ ] **Step 4: Run focused verification**

Run: `bunx vitest run --root apps/mobile --config vitest.config.ts tests/components/mobile-inbox-stream-item.test.tsx tests/components/mobile-inbox-stream-items.test.ts`

Run: `bunx tsc --noEmit -p apps/mobile/tsconfig.json`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add 'apps/mobile/app/(protected)/(tabs)/focus/index.tsx' apps/mobile/components/workspace/inbox-stream.tsx apps/mobile/tests/components/mobile-inbox-stream-item.test.tsx apps/mobile/tests/components/mobile-inbox-stream-items.test.ts
git commit -m "refactor(mobile): build grouped native list surface"
```

## Chunk 3: Web Grouped List

### Task 5: Apply the same grouped primitive to web

**Files:**
- Modify: `apps/web/app/components/notes-sidebar.tsx`
- Modify: `apps/web/app/components/notes-sidebar.test.tsx`

- [ ] **Step 1: Write the failing web test**

Ensure `apps/web/app/components/notes-sidebar.test.tsx` proves:

- grouped rounded shell exists
- rows still link correctly
- rows show title and timestamp
- row text does not include source words

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run --root apps/web --config vitest.config.ts app/components/notes-sidebar.test.tsx`

Expected: FAIL until the sidebar matches the shared primitive.

- [ ] **Step 3: Write the minimal web implementation**

Update `apps/web/app/components/notes-sidebar.tsx` so the sidebar uses:

- grouped rounded shell
- inset dividers
- tiny leading icon
- title
- metadata line
- no source words
- no row-card treatment

- [ ] **Step 4: Run focused verification**

Run: `bunx vitest run --root apps/web --config vitest.config.ts app/components/notes-sidebar.test.tsx app/hooks/use-inbox-stream.test.tsx app/components/header.test.tsx`

Run: `bunx tsc --noEmit -p apps/web/tsconfig.json`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/components/notes-sidebar.tsx apps/web/app/components/notes-sidebar.test.tsx
git commit -m "refactor(web): align grouped native list"
```

## Chunk 4: Final Verification

### Task 6: Run targeted verification and repo checks

**Files:**
- Modify: `docs/superpowers/specs/2026-03-20-focus-list-design.md` only if implementation forces a spec correction

- [ ] **Step 1: Run targeted tests**

Run: `bunx vitest run --root packages/ui --config vitest.config.ts src/tokens/notes.test.ts`

Run: `bunx vitest run --root apps/mobile --config vitest.config.ts tests/components/mobile-inbox-stream-item.test.tsx tests/components/mobile-inbox-stream-items.test.ts`

Run: `bunx vitest run --root apps/web --config vitest.config.ts app/components/notes-sidebar.test.tsx app/hooks/use-inbox-stream.test.tsx app/components/header.test.tsx`

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run: `bun run typecheck`

Expected: PASS.

- [ ] **Step 3: Run repo safety checks**

Run: `bun run check`

Expected: PASS.

- [ ] **Step 4: Commit final verification-only adjustments**

```bash
git add docs/superpowers/specs/2026-03-20-focus-list-design.md
git commit -m "chore: finalize grouped native list rollout"
```

- [ ] **Step 5: Prepare handoff summary**

Document:

- which mobile and web list surfaces now use the grouped primitive
- whether notes and chats share the same row structure
- whether extra type labels stayed removed
- any remaining visual tuning that still needs on-device review
