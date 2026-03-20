# Focus List Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace bordered-card focus rows with one calmer continuous list-row pattern that works for notes and chats across mobile and web, and establishes the shared direction for future desktop work.

**Architecture:** Keep the merged inbox data model in place and refactor presentation around a single continuous-surface row language. Start by codifying the list rhythm in shared notes tokens, then update the mobile workspace stream as the reference implementation, then align the web notes sidebar to the same row hierarchy and metadata rules.

**Tech Stack:** Bun, React, React Native, Expo Router, React Router, FlashList, Vitest, Testing Library, `@hominem/ui` tokens

---

## File Map

- Modify: `packages/ui/src/tokens/notes.ts`
  Purpose: define the shared continuous-list spacing, divider, hover, and title-first presentation tokens.
- Modify: `apps/mobile/components/workspace/inbox-stream.tsx`
  Purpose: remove card-like list spacing and make the stream read as one surface.
- Modify: `apps/mobile/components/workspace/inbox-stream-item.tsx`
  Purpose: implement the new row presentation, quiet metadata, and no-snippet default.
- Modify: `apps/mobile/components/workspace/inbox-stream-items.ts`
  Purpose: make snippet/preview optional in the shared item model and align note/chat metadata semantics.
- Modify: `apps/mobile/tests/components/mobile-inbox-stream-items.test.ts`
  Purpose: lock the mobile stream item model to the new title-first, preview-optional behavior.
- Modify: `apps/mobile/tests/design-system-radius.test.ts`
  Purpose: include any new mobile list files if the implementation gets split.
- Modify: `apps/web/app/hooks/use-inbox-stream.ts`
  Purpose: align the web inbox item model with the mobile row contract.
- Modify: `apps/web/app/components/notes-sidebar.tsx`
  Purpose: replace the sidebar’s pseudo-card rows with the continuous list row hierarchy.
- Create: `apps/web/app/components/notes-sidebar.test.tsx`
  Purpose: verify the shared row semantics and note/chat parity on the web surface.

## Chunk 1: Shared Row Contract

### Task 1: Update shared notes tokens for the new list rhythm

**Files:**
- Modify: `packages/ui/src/tokens/notes.ts`

- [ ] **Step 1: Write the failing token assertions**

Add or update a token test near the notes-token consumer tests if one exists. If there is no existing token-focused test, add a small Vitest file beside the token module:

`packages/ui/src/tokens/notes.test.ts`

```ts
import { describe, expect, it } from 'vitest'

import { notesTokens } from './notes'

describe('notesTokens.stream', () => {
  it('uses continuous list row semantics', () => {
    expect(notesTokens.stream.itemGap).toBe(0)
    expect(notesTokens.stream.itemRadius).toBe(0)
    expect(notesTokens.spacing.noteContentGap).toBeLessThan(notesTokens.spacing.noteSecondaryGap)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test --filter @hominem/ui`

Expected: FAIL because the current stream tokens still describe bordered rows with visible gaps and radius.

- [ ] **Step 3: Write the minimal token changes**

Update `packages/ui/src/tokens/notes.ts` so the stream tokens encode the approved design:

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

Also tighten the note-item semantics so preview is subordinate and optional:

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

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test --filter @hominem/ui`

Expected: PASS with the new continuous-list token contract.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/tokens/notes.ts packages/ui/src/tokens/notes.test.ts
git commit -m "refactor(ui): define continuous focus list tokens"
```

### Task 2: Make preview metadata optional in the shared inbox item model

**Files:**
- Modify: `apps/mobile/components/workspace/inbox-stream-items.ts`
- Modify: `apps/mobile/tests/components/mobile-inbox-stream-items.test.ts`
- Modify: `apps/web/app/hooks/use-inbox-stream.ts`

- [ ] **Step 1: Write the failing mobile data-shape test**

Extend `apps/mobile/tests/components/mobile-inbox-stream-items.test.ts` with assertions that the default stream rows do not depend on a visible preview:

```ts
it('keeps previews optional for the default row contract', () => {
  const [item] = toInboxStreamItems({
    focusItems: [makeNote({ title: 'A single line title' })],
    sessions: [],
  })

  expect(item.title).toBe('A single line title')
  expect(item.preview).toBeNull()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test --filter mobile-inbox-stream-items`

Expected: FAIL because the mobile mapper currently returns hard-coded preview copy.

- [ ] **Step 3: Write the minimal shared-model implementation**

Update the shared item contract in `apps/mobile/components/workspace/inbox-stream-items.ts`:

```ts
export interface InboxStreamItem {
  id: string
  kind: 'note' | 'chat'
  title: string
  preview: string | null
  timestamp: string
  route: string
}
```

Update both mappers to return `preview: null` for the default state. Keep the fallback title logic, but stop manufacturing secondary copy that the new row will not render.

Mirror that contract in `apps/web/app/hooks/use-inbox-stream.ts`:

```ts
export interface InboxNoteItem {
  ...
  preview: string | null
  ...
}

export interface InboxChatItem {
  ...
  preview: string | null
  ...
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run test --filter mobile-inbox-stream-items`

Expected: PASS with `preview` now optional and title logic unchanged.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/components/workspace/inbox-stream-items.ts apps/mobile/tests/components/mobile-inbox-stream-items.test.ts apps/web/app/hooks/use-inbox-stream.ts
git commit -m "refactor(inbox): make list previews optional"
```

## Chunk 2: Mobile Reference Implementation

### Task 3: Convert the mobile inbox stream from cards to a continuous list

**Files:**
- Modify: `apps/mobile/components/workspace/inbox-stream.tsx`
- Modify: `apps/mobile/components/workspace/inbox-stream-item.tsx`
- Test: `apps/mobile/tests/design-system-radius.test.ts`

- [ ] **Step 1: Write the failing mobile row presentation test**

Create a focused component test if one does not already exist:

`apps/mobile/tests/components/mobile-inbox-stream-item.test.tsx`

```tsx
import { render, screen } from '@testing-library/react-native'
import { describe, expect, it } from 'vitest'

import { InboxStreamItem } from '../../components/workspace/inbox-stream-item'

describe('InboxStreamItem', () => {
  it('renders a title-first row without default preview copy', () => {
    render(
      <InboxStreamItem
        item={{
          id: 'note-1',
          kind: 'note',
          title: 'Morning capture',
          preview: null,
          timestamp: '2026-03-20T09:30:00.000Z',
          route: '/(protected)/(tabs)/focus/note-1',
        }}
      />,
    )

    expect(screen.getByText('Morning capture')).toBeTruthy()
    expect(screen.queryByText('Note')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test --filter mobile-inbox-stream-item`

Expected: FAIL because the current row still renders footer preview copy and card styling assumptions.

- [ ] **Step 3: Write the minimal presentation refactor**

In `apps/mobile/components/workspace/inbox-stream-item.tsx`:

- remove the bordered `card` treatment
- replace it with one full-width row surface
- keep the title as the dominant text
- render timestamp as quiet trailing metadata
- render the note/chat icon as a subtle cue, not a badge
- only render `preview` when `item.preview` is non-null

Target structure:

```tsx
<Pressable style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}>
  <View style={styles.leading}>
    <AppIcon ... />
  </View>
  <View style={styles.content}>
    <Text numberOfLines={1} style={styles.title}>{item.title}</Text>
    {item.preview ? <Text numberOfLines={1} style={styles.preview}>{item.preview}</Text> : null}
  </View>
  <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
</Pressable>
```

In `apps/mobile/components/workspace/inbox-stream.tsx`:

- remove the artificial card-gap separator
- move to divider-based separation
- keep one continuous content container with consistent horizontal padding
- simplify the empty state so it is not another bordered card

If the implementation needs a dedicated divider component or extracted row styles, add those files and then append them to `apps/mobile/tests/design-system-radius.test.ts`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run test --filter mobile-inbox-stream-item`

Run: `bun run test --filter mobile-inbox-stream-items`

Run: `bun run test --filter design-system-radius`

Expected: PASS, with no hard-coded radius regressions and the new row semantics in place.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/components/workspace/inbox-stream.tsx apps/mobile/components/workspace/inbox-stream-item.tsx apps/mobile/tests/components/mobile-inbox-stream-item.test.tsx apps/mobile/tests/components/mobile-inbox-stream-items.test.ts apps/mobile/tests/design-system-radius.test.ts
git commit -m "refactor(mobile): adopt continuous inbox list rows"
```

## Chunk 3: Web Rollout

### Task 4: Align the web notes sidebar with the shared row primitive

**Files:**
- Modify: `apps/web/app/components/notes-sidebar.tsx`
- Modify: `apps/web/app/hooks/use-inbox-stream.ts`
- Create: `apps/web/app/components/notes-sidebar.test.tsx`

- [ ] **Step 1: Write the failing web sidebar test**

Create `apps/web/app/components/notes-sidebar.test.tsx` with a focused regression around title-first rows:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import NotesSidebar from './notes-sidebar'

vi.mock('~/hooks/use-inbox-stream', () => ({
  useInboxStream: () => ({
    isLoading: false,
    items: [
      { kind: 'note', id: 'note-1', title: 'Morning capture', preview: null, updatedAt: '2026-03-20T09:30:00.000Z', note: {} },
      { kind: 'chat', id: 'chat-1', title: 'Planning thread', preview: null, updatedAt: '2026-03-20T09:00:00.000Z', chat: {} },
    ],
    noteCount: 1,
    chatCount: 1,
  }),
}))

describe('NotesSidebar', () => {
  it('renders note and chat rows with the same title-first structure', () => {
    render(
      <MemoryRouter>
        <NotesSidebar />
      </MemoryRouter>,
    )

    expect(screen.getByText('Morning capture')).toBeInTheDocument()
    expect(screen.getByText('Planning thread')).toBeInTheDocument()
    expect(screen.queryByText('Conversation')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test --filter notes-sidebar`

Expected: FAIL because the current sidebar still relies on rounded row blocks and older item semantics.

- [ ] **Step 3: Write the minimal web implementation**

In `apps/web/app/components/notes-sidebar.tsx`:

- remove the rounded pseudo-card row treatment
- use a continuous `<ul>` with divider-driven rows
- keep note and chat rows structurally identical
- de-emphasize type icons and action affordances
- keep title as the only always-visible content line
- show timestamp only if it can stay visually quiet in the trailing area

Refactor `SidebarFocusItem` toward:

```tsx
<li className="group/item border-b border-sidebar-border/40 last:border-b-0">
  <div className="flex items-center gap-2 px-3 py-2.5">
    <Icon className="size-3.5 shrink-0 opacity-40" />
    <Link ... className="min-w-0 flex-1 truncate text-sm text-sidebar-foreground">
      {item.title || 'Untitled'}
    </Link>
    <span className="text-xs text-sidebar-foreground/40">{formatDate(item.updatedAt)}</span>
    <DropdownMenuTrigger ... />
  </div>
</li>
```

In `apps/web/app/hooks/use-inbox-stream.ts`, keep the data contract aligned with mobile by using `preview: null` in the default state.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run test --filter notes-sidebar`

Run: `bun run test --filter header`

Expected: PASS, with the sidebar rows now matching the shared row rules and no regression in latest-destination logic.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/components/notes-sidebar.tsx apps/web/app/components/notes-sidebar.test.tsx apps/web/app/hooks/use-inbox-stream.ts apps/web/app/components/header.test.tsx
git commit -m "refactor(web): align notes sidebar with continuous list rows"
```

## Chunk 4: Final Verification

### Task 5: Run focused checks and repo safety validation

**Files:**
- Modify: `docs/superpowers/specs/2026-03-20-focus-list-design.md` only if implementation forces a spec correction

- [ ] **Step 1: Run targeted mobile and web tests**

Run: `bun run test --filter mobile-inbox-stream-item`

Run: `bun run test --filter mobile-inbox-stream-items`

Run: `bun run test --filter design-system-radius`

Run: `bun run test --filter notes-sidebar`

Run: `bun run test --filter header`

Expected: PASS for all targeted list and sidebar coverage.

- [ ] **Step 2: Run typecheck**

Run: `bun run typecheck`

Expected: PASS with the new row contract shared across mobile and web.

- [ ] **Step 3: Run repo safety checks**

Run: `bun run check`

Expected: PASS after rebuilding types and running the standard safety suite.

- [ ] **Step 4: Commit final verification-only adjustments**

```bash
git add docs/superpowers/specs/2026-03-20-focus-list-design.md
git commit -m "chore: finalize focus list rollout verification"
```

- [ ] **Step 5: Prepare handoff summary**

Document:

- which list surfaces were updated
- whether timestamp rendering stayed visible on both platforms
- whether preview stayed disabled by default
- any desktop follow-up still pending because no desktop surface currently consumes the shared row pattern
