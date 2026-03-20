# App Layout Simplification Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse `AppLayout` to a single top-header shell with a minimal API of `children` and optional `navigation`.

**Architecture:** Remove all conditional shell branching from `AppLayout` and make the existing top-header structure the only implementation. Delete `sidebar`, `backgroundImage`, and `contentMode` from the component API, update the current web consumer, and replace the sidebar-based test coverage with tests for the single-shell contract.

**Tech Stack:** React 19, React Router, Vitest, Testing Library, Bun, shared UI package.

---

## Chunk 1: Replace the outdated test contract

**Files:**
- Modify: `packages/ui/src/components/layout/app-layout.test.tsx`
- Reference: `docs/superpowers/specs/2026-03-20-app-layout-simplification-design.md`

- [ ] **Step 1: Write the failing tests for the simplified `AppLayout` API**

```tsx
it('renders navigation and children in the single top-header shell', () => {
  render(
    <AppLayout navigation={<div>Header</div>}>
      <div>Content</div>
    </AppLayout>,
  )

  expect(screen.getByText('Header')).toBeInTheDocument()
  expect(screen.getByText('Content')).toBeInTheDocument()
})

it('shows the navigation progress bar when routing is pending', () => {
  mockNavigation('loading')
  render(<AppLayout><div>Content</div></AppLayout>)
  expect(screen.getByLabelText('Navigation progress')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the focused test file to confirm it fails**

Run:
`bun test --filter @hominem/ui -- app-layout.test.tsx`

Expected: FAIL because the current tests and component still assume sidebar behavior.

- [ ] **Step 3: Remove sidebar-specific test helpers**

Delete the sidebar-state probe, viewport helpers, and sidebar-motion assertions so the test file matches the new single-shell intent.

- [ ] **Step 4: Re-run the focused test file**

Run:
`bun test --filter @hominem/ui -- app-layout.test.tsx`

Expected: still FAIL, now against the simplified shell implementation.

- [ ] **Step 5: Commit the test rewrite**

```bash
git add packages/ui/src/components/layout/app-layout.test.tsx
git commit -m "test(ui): rewrite app layout contract tests"
```

## Chunk 2: Simplify the `AppLayout` component API and implementation

**Files:**
- Modify: `packages/ui/src/components/layout/app-layout.tsx`
- Test: `packages/ui/src/components/layout/app-layout.test.tsx`

- [ ] **Step 1: Remove the failing props from the component type**

Update the props to:

```ts
interface AppLayoutProps {
  children: React.ReactNode
  navigation?: React.ReactNode
}
```

- [ ] **Step 2: Run the focused UI test**

Run:
`bun test --filter @hominem/ui -- app-layout.test.tsx`

Expected: FAIL until the implementation matches the new API.

- [ ] **Step 3: Implement the single-shell layout**

Delete:

- `SidebarProvider`
- `SidebarInset`
- `sidebar` prop handling
- `backgroundImage` handling
- `contentMode` handling
- the legacy comment

Keep:

- navigation progress indicator
- optional `navigation`
- one content container inside the top-header shell

- [ ] **Step 4: Run the focused UI test again**

Run:
`bun test --filter @hominem/ui -- app-layout.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the component simplification**

```bash
git add packages/ui/src/components/layout/app-layout.tsx packages/ui/src/components/layout/app-layout.test.tsx
git commit -m "refactor(ui): simplify app layout"
```

## Chunk 3: Update current consumers and verify the repo

**Files:**
- Modify: `apps/web/app/routes/layout.tsx`
- Reference: `packages/ui/src/components/layout/app-layout.tsx`

- [ ] **Step 1: Remove deleted props from the current web consumer**

Update the route layout to stop passing `contentMode="full-bleed"` and any other removed props.

- [ ] **Step 2: Run the relevant web and UI tests**

Run:
`bun run --filter @hominem/ui test -- app-layout.test.tsx`
`bun run --filter @hominem/web test`

Expected: PASS.

- [ ] **Step 3: Run typecheck to catch any hidden removed-prop usage**

Run:
`bun run --filter @hominem/ui typecheck`
`bun run --filter @hominem/web typecheck`

Expected: PASS.

- [ ] **Step 4: Run the repo safety check**

Run:
`bun run check`

Expected: PASS.

- [ ] **Step 5: Commit the consumer cleanup**

```bash
git add apps/web/app/routes/layout.tsx packages/ui/src/components/layout/app-layout.tsx packages/ui/src/components/layout/app-layout.test.tsx docs/superpowers/specs/2026-03-20-app-layout-simplification-design.md docs/superpowers/plans/2026-03-20-app-layout-simplification.md
git commit -m "refactor(ui): collapse app layout API"
```
