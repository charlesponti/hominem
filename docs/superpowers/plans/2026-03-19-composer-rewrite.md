# Composer Rewrite Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the web composer around a small action model with focused components, safer async behavior, and cleaner desktop interaction polish.

**Architecture:** Keep a single composer container in `apps/web/app/components/composer` responsible for route context, mutations, modal state, and resolved actions. Extract a small action resolver plus focused presentational components so the render layer stays dumb, keyboard and button execution share the same code path, and cleanup rules remain posture-specific but centralized.

**Tech Stack:** React 19, React Router 7, Vitest, Testing Library, Playwright, Bun, existing `@hominem/*` hooks and UI primitives.

---

## Chunk 1: Lock the composer behavior with focused tests

**Files:**
- Create: `apps/web/app/components/composer/composer-actions.test.ts`
- Create: `apps/web/app/components/composer/index.test.tsx`
- Modify: `apps/web/app/components/composer/index.tsx`
- Reference: `docs/superpowers/specs/2026-03-19-composer-rewrite-design.md`

- [ ] **Step 1: Write the failing action resolver tests**

```ts
describe('resolveComposerActions', () => {
  it('maps capture primary to note creation', async () => {
    const deps = createActionDeps({ posture: 'capture', draftText: 'Hello' })
    await deps.actions.primary.execute()
    expect(deps.createNote).toHaveBeenCalledWith({ content: 'Hello', title: 'Hello' })
  })

  it('maps reply primary to chat send with note context', async () => {
    const deps = createActionDeps({
      posture: 'reply',
      chatId: 'chat-1',
      draftText: 'Question',
      attachedNotes: [{ id: 'n1', title: 'Context', content: 'Body' }],
    })
    await deps.actions.primary.execute()
    expect(deps.sendMessage).toHaveBeenCalledWith({
      chatId: 'chat-1',
      message: expect.stringContaining('<context>'),
    })
  })
})
```

- [ ] **Step 2: Write the failing composer interaction tests**

```tsx
it('submits the resolved primary action on Enter and ignores Enter when disabled', async () => {
  render(<Composer />)
  const input = screen.getByTestId('composer-input')
  await user.type(input, 'Draft')
  await user.keyboard('{Enter}')
  expect(mockPrimaryAction).toHaveBeenCalledTimes(1)
})

it('prevents a second submit while the first action is still pending', async () => {
  // mock a pending action and assert only one execution fires
})
```

- [ ] **Step 3: Run the focused tests to confirm they fail**

Run:
`bun test --filter @hominem/web -- composer-actions.test.ts index.test.tsx`

Expected: FAIL because the resolver and interaction seams do not exist yet.

- [ ] **Step 4: Add the minimum seams needed for testing**

Create a small exported resolver target and expose stable test hooks from the composer only where necessary, without doing the full rewrite yet.

- [ ] **Step 5: Run the focused tests again**

Run:
`bun test --filter @hominem/web -- composer-actions.test.ts index.test.tsx`

Expected: still FAIL, but now against behavior instead of missing modules.

- [ ] **Step 6: Commit the test harness**

```bash
git add apps/web/app/components/composer/composer-actions.test.ts apps/web/app/components/composer/index.test.tsx apps/web/app/components/composer/index.tsx
git commit -m "test(web): lock composer rewrite behavior"
```

## Chunk 2: Extract and implement the action resolver

**Files:**
- Create: `apps/web/app/components/composer/composer-actions.ts`
- Modify: `apps/web/app/components/composer/index.tsx`
- Test: `apps/web/app/components/composer/composer-actions.test.ts`

- [ ] **Step 1: Write the failing resolver cases for every posture**

```ts
it('maps draft secondary to note discussion chat creation', async () => {
  const deps = createActionDeps({
    posture: 'draft',
    noteId: 'note-1',
    noteTitle: 'Roadmap',
    draftText: 'Help me think through this',
  })
  await deps.actions.secondary.execute()
  expect(deps.createChat).toHaveBeenCalledWith({
    title: 'Help me think through this',
    seedText: '[Regarding note: "Roadmap"]\n\nHelp me think through this',
  })
})
```

- [ ] **Step 2: Run the resolver test file**

Run:
`bun test --filter @hominem/web -- composer-actions.test.ts`

Expected: FAIL because the resolver does not yet encode all posture behavior.

- [ ] **Step 3: Implement `composer-actions.ts` with centralized cleanup and draft sanitizing**

```ts
export function resolveComposerActions(input: ResolveComposerActionsInput): ComposerResolvedActions {
  const text = input.draftText.trim()
  const canSubmit = text.length > 0 && !input.isSubmitting

  return {
    canSubmit,
    primary: buildPrimaryAction({ ...input, text, canSubmit }),
    secondary: buildSecondaryAction({ ...input, text, canSubmit }),
  }
}
```

Keep note-context building and per-posture cleanup in this module so `index.tsx` only wires dependencies and invokes resolved actions.

- [ ] **Step 4: Update the composer container to use the resolver**

Replace duplicated `handlePrimary` and `handleSecondary` logic with the shared resolved actions and route the Enter key handler through the same primary execution path.

- [ ] **Step 5: Run the resolver and composer tests**

Run:
`bun test --filter @hominem/web -- composer-actions.test.ts index.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit the resolver extraction**

```bash
git add apps/web/app/components/composer/composer-actions.ts apps/web/app/components/composer/composer-actions.test.ts apps/web/app/components/composer/index.tsx apps/web/app/components/composer/index.test.tsx
git commit -m "refactor(web): centralize composer actions"
```

## Chunk 3: Split the composer UI into focused components

**Files:**
- Create: `apps/web/app/components/composer/composer-shell.tsx`
- Create: `apps/web/app/components/composer/composer-tools.tsx`
- Create: `apps/web/app/components/composer/composer-actions-row.tsx`
- Create: `apps/web/app/components/composer/attached-notes-list.tsx`
- Modify: `apps/web/app/components/composer/index.tsx`
- Test: `apps/web/app/components/composer/index.test.tsx`

- [ ] **Step 1: Extend the composer interaction test to assert structure**

```tsx
it('renders the shell with textarea, attached-note context, tools, and actions', () => {
  render(<Composer />)
  expect(screen.getByTestId('composer-input')).toBeInTheDocument()
  expect(screen.getByLabelText('Voice note')).toBeInTheDocument()
  expect(screen.getByTestId('composer-primary')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the composer interaction test**

Run:
`bun test --filter @hominem/web -- index.test.tsx`

Expected: FAIL once the new structure expectations are added.

- [ ] **Step 3: Extract the presentational components**

```tsx
export function ComposerShell({ input, attachments, tools, actions }: ComposerShellProps) {
  return (
    <div className="...">
      {input}
      {attachments}
      <div className="...">
        {tools}
        {actions}
      </div>
    </div>
  )
}
```

Move repeated button styling into shared local components or a tiny shared button primitive so `ToolBtn`, `SecondaryBtn`, and `PrimaryBtn` stop duplicating structure.

- [ ] **Step 4: Keep the container small**

Reduce `index.tsx` to route context, state wiring, modal wiring, and resolved view-model assembly. Avoid moving async behavior back into the presentational components.

- [ ] **Step 5: Run the focused web component tests**

Run:
`bun test --filter @hominem/web -- composer-actions.test.ts index.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit the UI split**

```bash
git add apps/web/app/components/composer/composer-shell.tsx apps/web/app/components/composer/composer-tools.tsx apps/web/app/components/composer/composer-actions-row.tsx apps/web/app/components/composer/attached-notes-list.tsx apps/web/app/components/composer/index.tsx apps/web/app/components/composer/index.test.tsx
git commit -m "refactor(web): split composer UI surface"
```

## Chunk 4: Tighten loading, focus, and modal behavior

**Files:**
- Modify: `apps/web/app/components/composer/index.tsx`
- Modify: `apps/web/app/components/composer/composer-tools.tsx`
- Modify: `apps/web/app/components/composer/note-picker.tsx`
- Test: `apps/web/app/components/composer/index.test.tsx`
- Reference: `apps/web/tests/assistant-lifecycle.spec.ts`
- Reference: `apps/web/tests/chat-ui.spec.ts`

- [ ] **Step 1: Add failing tests for focus and pending-state rules**

```tsx
it('returns focus to the composer after audio transcription completes', async () => {
  // mock ChatModals callback, fire transcription, assert textarea focus
})

it('clears attached notes only after reply send consumes context', async () => {
  // assert notes persist for non-chat actions and clear after reply primary
})
```

- [ ] **Step 2: Run the focused component tests**

Run:
`bun test --filter @hominem/web -- index.test.tsx`

Expected: FAIL because cleanup and focus behavior are not fully centralized yet.

- [ ] **Step 3: Implement the interaction fixes**

Make pending state disable the correct controls, make keyboard submit respect the resolved enabled state, return focus after note picker and voice modal flows, and ensure cleanup differs correctly between capture, draft, and reply actions.

- [ ] **Step 4: Run the targeted component and Playwright tests**

Run:
`bun test --filter @hominem/web -- index.test.tsx`
`bun run --filter @hominem/web test:e2e -- tests/assistant-lifecycle.spec.ts`
`bun run --filter @hominem/web test:e2e -- tests/chat-ui.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit the behavior polish**

```bash
git add apps/web/app/components/composer/index.tsx apps/web/app/components/composer/composer-tools.tsx apps/web/app/components/composer/note-picker.tsx apps/web/app/components/composer/index.test.tsx
git commit -m "fix(web): polish composer interaction state"
```

## Chunk 5: Apply restrained desktop polish and finish verification

**Files:**
- Modify: `apps/web/app/components/composer/composer-shell.tsx`
- Modify: `apps/web/app/components/composer/composer-tools.tsx`
- Modify: `apps/web/app/components/composer/composer-actions-row.tsx`
- Modify: `apps/web/app/components/composer/attached-notes-list.tsx`
- Test: `apps/web/app/components/composer/index.test.tsx`

- [ ] **Step 1: Add a failing UI assertion for the polished states**

```tsx
it('exposes accessible labels and disabled semantics for tool and action buttons', () => {
  render(<Composer />)
  expect(screen.getByTestId('composer-primary')).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Voice note' })).toHaveAttribute('title', 'Voice note')
})
```

- [ ] **Step 2: Run the focused component test**

Run:
`bun test --filter @hominem/web -- index.test.tsx`

Expected: FAIL if the polished semantics are not present yet.

- [ ] **Step 3: Implement the restrained visual polish**

Tune spacing, button feedback, and hierarchy inside the extracted components without changing the route model or turning this into a full redesign. Keep the writing area dominant and make tool and action states easier to read at a glance.

- [ ] **Step 4: Run the full local verification set**

Run:
`bun run --filter @hominem/web test`
`bun run --filter @hominem/web typecheck`
`bun run check`

Expected: PASS.

- [ ] **Step 5: Commit the finished rewrite**

```bash
git add apps/web/app/components/composer apps/web/package.json docs/superpowers/specs/2026-03-19-composer-rewrite-design.md docs/superpowers/plans/2026-03-19-composer-rewrite.md
git commit -m "refactor(web): rewrite composer surface"
```
