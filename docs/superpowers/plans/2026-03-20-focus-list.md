# Focus List Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace bordered-card focus rows with an Apple Notes-style grouped list pattern that uses rounded section containers, internal dividers, and stacked metadata for notes and chats across mobile and web.

**Architecture:** Keep the merged inbox data model in place and refactor presentation around grouped section shells rather than standalone cards. Start by codifying the grouped Notes-style container and row rhythm in shared tokens, then update the mobile workspace stream as the reference implementation, then align the web notes sidebar to the same section-shell and stacked-metadata rules.

**Tech Stack:** Bun, React, React Native, Expo Router, React Router, FlashList, Vitest, Testing Library, `@hominem/ui` tokens

---

## File Map

- Modify: `packages/ui/src/tokens/notes.ts`
  Purpose: define the shared grouped-list spacing, section-shell, divider, and stacked-metadata presentation tokens.
- Modify: `packages/ui/src/tokens/notes.test.ts`
  Purpose: lock the token contract to the grouped Apple Notes model.
- Modify: `apps/mobile/components/workspace/inbox-stream.tsx`
  Purpose: render the mobile stream inside grouped rounded section shells instead of standalone row cards.
- Modify: `apps/mobile/components/workspace/inbox-stream-item.tsx`
  Purpose: implement the title-first stacked metadata row hierarchy used inside section shells.
- Modify: `apps/mobile/components/workspace/inbox-stream-items.ts`
  Purpose: keep preview optional and align shared row metadata semantics.
- Modify: `apps/mobile/tests/components/mobile-inbox-stream-item.test.tsx`
  Purpose: guard the mobile row structure against regressions back to card-like layout.
- Modify: `apps/mobile/tests/components/mobile-inbox-stream-items.test.ts`
  Purpose: lock the shared mobile item model to the no-snippet default.
- Modify: `apps/web/app/hooks/use-inbox-stream.ts`
  Purpose: align the web inbox item model with the shared grouped-row contract.
- Modify: `apps/web/app/hooks/use-inbox-stream.test.tsx`
  Purpose: verify the web hook keeps preview nullable and fallback titles aligned.
- Modify: `apps/web/app/components/notes-sidebar.tsx`
  Purpose: replace individual pseudo-card rows with a grouped Notes-style shell and stacked metadata rows.
- Create: `apps/web/app/components/notes-sidebar.test.tsx`
  Purpose: verify the grouped-shell and shared row semantics on web.

## Chunk 1: Shared Row Contract

### Task 1: Update shared notes tokens for grouped Apple Notes rhythm

**Files:**
- Modify: `packages/ui/src/tokens/notes.ts`
- Modify: `packages/ui/src/tokens/notes.test.ts`

- [ ] **Step 1: Write the failing token assertions**

Add or update a token test beside the notes token module:

```ts
import { describe, expect, it } from 'vitest'

import { notesTokens } from './notes'

describe('notesTokens.stream', () => {
  it('uses grouped list row semantics', () => {
    expect(notesTokens.stream.itemGap).toBe(0)
    expect(notesTokens.stream.itemRadius).toBe(0)
    expect(notesTokens.stream.typeIconSize).toBe(14)
    expect(notesTokens.radii.panel).toBeGreaterThan(0)
    expect(notesTokens.spacing.noteContentGap).toBeLessThan(notesTokens.spacing.noteSecondaryGap)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run --root packages/ui --config vitest.config.ts src/tokens/notes.test.ts`

Expected: FAIL because the current tokens do not fully encode the grouped section-shell contract.

- [ ] **Step 3: Write the minimal token changes**

Update `packages/ui/src/tokens/notes.ts` so the row internals and shells match the approved design:

```ts
export const notesStream = {
  itemSurface: colors['bg-base'],
  itemBorder: colors['border-subtle'],
  itemHover: colors['bg-surface'],
  itemRadius: 0,
  itemPaddingX: spacing[5],
  itemPaddingY: spacing[4],
  itemGap: 0,
  typeIconSize: 14,
} as const
```

Keep the row internals tight enough for stacked metadata:

```ts
export const notesSpacing = {
  ...
  feedItemGap: spacing[0],
  feedItemPaddingX: spacing[5],
  feedItemPaddingY: spacing[4],
  noteContentGap: spacing[1],
  noteSecondaryGap: spacing[3],
  ...
} as const
```

Retain rounded panel tokens so section shells stay visibly grouped.

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run --root packages/ui --config vitest.config.ts src/tokens/notes.test.ts`

Expected: PASS with the grouped-list token contract.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/tokens/notes.ts packages/ui/src/tokens/notes.test.ts
git commit -m "refactor(ui): define grouped focus list tokens"
```

### Task 2: Keep preview metadata optional in the shared inbox item model

**Files:**
- Modify: `apps/mobile/components/workspace/inbox-stream-items.ts`
- Modify: `apps/mobile/tests/components/mobile-inbox-stream-items.test.ts`
- Modify: `apps/web/app/hooks/use-inbox-stream.ts`
- Modify: `apps/web/app/hooks/use-inbox-stream.test.tsx`

- [ ] **Step 1: Write the failing model tests**

Extend the focused tests so both mobile and web prove the grouped-row data contract:

```ts
expect(item.preview).toBeNull()
expect(chatItem.title).toBe('Untitled session')
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bunx vitest run --root apps/mobile --config vitest.config.ts tests/components/mobile-inbox-stream-items.test.ts`

Run: `bunx vitest run --root apps/web --config vitest.config.ts app/hooks/use-inbox-stream.test.tsx`

Expected: FAIL if either surface still manufactures preview copy or uses divergent fallback titles.

- [ ] **Step 3: Write the minimal shared-model implementation**

Keep `preview` nullable in both mobile and web item models:

```ts
preview: string | null
```

Return `preview: null` for the default state and align fallback chat titles to the shared contract.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bunx vitest run --root apps/mobile --config vitest.config.ts tests/components/mobile-inbox-stream-items.test.ts`

Run: `bunx vitest run --root apps/web --config vitest.config.ts app/hooks/use-inbox-stream.test.tsx`

Expected: PASS with no-snippet default and aligned fallback titles.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/components/workspace/inbox-stream-items.ts apps/mobile/tests/components/mobile-inbox-stream-items.test.ts apps/web/app/hooks/use-inbox-stream.ts apps/web/app/hooks/use-inbox-stream.test.tsx
git commit -m "refactor(inbox): align grouped row item model"
```

## Chunk 2: Mobile Reference Implementation

### Task 3: Convert the mobile inbox stream from cards to grouped Apple Notes sections

**Files:**
- Modify: `apps/mobile/components/workspace/inbox-stream.tsx`
- Modify: `apps/mobile/components/workspace/inbox-stream-item.tsx`
- Modify: `apps/mobile/tests/components/mobile-inbox-stream-item.test.tsx`
- Modify: `apps/mobile/tests/design-system-radius.test.ts` only if new files are introduced

- [ ] **Step 1: Write the failing mobile row presentation test**

Use a focused regression around the grouped Notes structure:

```ts
expect(source).not.toContain('borderWidth: 1')
expect(source).toContain('item.kind === \'note\' ? \'Notes\' : \'Chats\'')
expect(source).toContain('formatTimestamp(item.timestamp)')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run --root apps/mobile --config vitest.config.ts tests/components/mobile-inbox-stream-item.test.tsx`

Expected: FAIL because the current row still uses card styling or non-Notes hierarchy.

- [ ] **Step 3: Write the minimal mobile implementation**

In `apps/mobile/components/workspace/inbox-stream-item.tsx`:

- remove the bordered card treatment
- make the row read as content inside a section shell
- use title as the dominant line
- stack metadata beneath the title
- add a quiet source/type line beneath metadata
- keep preview conditional and subordinate if it appears
- keep the icon subtle

Target structure:

```tsx
<Pressable style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}>
  <View style={styles.leadingIcon}>
    <AppIcon ... />
  </View>
  <View style={styles.content}>
    <Text numberOfLines={1} style={styles.title}>{item.title}</Text>
    <Text numberOfLines={1} style={styles.metadata}>{formatTimestamp(item.timestamp)}</Text>
    <Text numberOfLines={1} style={styles.sourceLabel}>{item.kind === 'note' ? 'Notes' : 'Chats'}</Text>
    {item.preview ? <Text numberOfLines={1} style={styles.preview}>{item.preview}</Text> : null}
  </View>
</Pressable>
```

In `apps/mobile/components/workspace/inbox-stream.tsx`:

- wrap rows in one rounded section shell
- use internal dividers instead of free-floating row gaps
- keep page-level breathing room around the shell
- make the empty state align with the grouped-shell language rather than another bordered box

- [ ] **Step 4: Run tests to verify they pass**

Run: `bunx vitest run --root apps/mobile --config vitest.config.ts tests/components/mobile-inbox-stream-item.test.tsx`

Run: `bunx vitest run --root apps/mobile --config vitest.config.ts tests/components/mobile-inbox-stream-items.test.ts`

Run: `bunx tsc --noEmit -p apps/mobile/tsconfig.json`

Expected: PASS with the grouped mobile surface in place.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/components/workspace/inbox-stream.tsx apps/mobile/components/workspace/inbox-stream-item.tsx apps/mobile/tests/components/mobile-inbox-stream-item.test.tsx apps/mobile/tests/components/mobile-inbox-stream-items.test.ts apps/mobile/tests/design-system-radius.test.ts
git commit -m "refactor(mobile): adopt grouped inbox sections"
```

## Chunk 3: Web Rollout

### Task 4: Align the web notes sidebar with the grouped Apple Notes primitive

**Files:**
- Modify: `apps/web/app/components/notes-sidebar.tsx`
- Modify: `apps/web/app/hooks/use-inbox-stream.ts`
- Create: `apps/web/app/components/notes-sidebar.test.tsx`

- [ ] **Step 1: Write the failing web sidebar test**

Create a focused regression around the grouped-shell structure:

```tsx
expect(screen.getByText('Morning capture')).toBeInTheDocument()
expect(screen.getByText('Planning thread')).toBeInTheDocument()
expect(screen.getAllByText(/Notes|Chats/).length).toBeGreaterThan(0)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run --root apps/web --config vitest.config.ts app/components/notes-sidebar.test.tsx`

Expected: FAIL because the current sidebar still uses individual rounded rows and does not match the grouped Notes shell.

- [ ] **Step 3: Write the minimal web implementation**

In `apps/web/app/components/notes-sidebar.tsx`:

- remove the individual rounded row treatment
- wrap rows in a rounded grouped shell
- use internal dividers
- keep note and chat rows structurally identical
- stack metadata below the title
- add a tiny source/type line
- keep snippets off by default

Target shape:

```tsx
<div className="rounded-[28px] bg-sidebar p-0 overflow-hidden">
  <ul>
    <li className="border-b border-sidebar-border/40 last:border-b-0">
      <Link ... className="flex items-start gap-2 px-4 py-3">
        <Icon className="mt-0.5 size-3.5 shrink-0 opacity-40" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-sidebar-foreground">{item.title}</div>
          <div className="truncate text-xs text-sidebar-foreground/50">{formatDate(item.updatedAt)}</div>
          <div className="truncate text-[11px] text-sidebar-foreground/35">{item.kind === 'note' ? 'Notes' : 'Chats'}</div>
        </div>
      </Link>
    </li>
  </ul>
</div>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bunx vitest run --root apps/web --config vitest.config.ts app/components/notes-sidebar.test.tsx`

Run: `bunx vitest run --root apps/web --config vitest.config.ts app/components/header.test.tsx`

Run: `bunx vitest run --root apps/web --config vitest.config.ts app/hooks/use-inbox-stream.test.tsx`

Expected: PASS with the sidebar now matching the grouped Notes model and no regression in latest-destination logic.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/components/notes-sidebar.tsx apps/web/app/components/notes-sidebar.test.tsx apps/web/app/hooks/use-inbox-stream.ts apps/web/app/hooks/use-inbox-stream.test.tsx apps/web/app/components/header.test.tsx
git commit -m "refactor(web): align notes sidebar with grouped list shells"
```

## Chunk 4: Final Verification

### Task 5: Run focused checks and repo safety validation

**Files:**
- Modify: `docs/superpowers/specs/2026-03-20-focus-list-design.md` only if implementation forces a spec correction

- [ ] **Step 1: Run targeted mobile and web tests**

Run: `bunx vitest run --root apps/mobile --config vitest.config.ts tests/components/mobile-inbox-stream-item.test.tsx tests/components/mobile-inbox-stream-items.test.ts`

Run: `bunx vitest run --root apps/web --config vitest.config.ts app/hooks/use-inbox-stream.test.tsx app/components/notes-sidebar.test.tsx app/components/header.test.tsx`

Run: `bunx vitest run --root packages/ui --config vitest.config.ts src/tokens/notes.test.ts`

Expected: PASS for all targeted grouped-list coverage.

- [ ] **Step 2: Run typecheck**

Run: `bun run typecheck`

Expected: PASS with the grouped row contract shared across mobile and web.

- [ ] **Step 3: Run repo safety checks**

Run: `bun run check`

Expected: PASS after rebuilding types and running the standard safety suite.

- [ ] **Step 4: Commit final verification-only adjustments**

```bash
git add docs/superpowers/specs/2026-03-20-focus-list-design.md
git commit -m "chore: finalize grouped focus list rollout verification"
```

- [ ] **Step 5: Prepare handoff summary**

Document:

- which list surfaces were updated
- whether metadata stacked correctly on both platforms
- whether preview stayed disabled by default
- any desktop follow-up still pending because no desktop surface currently consumes the shared row pattern
