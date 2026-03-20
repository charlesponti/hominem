# App Layout Removal Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove `AppLayout` from `@hominem/ui` and make the web app own its shell directly.

**Architecture:** Inline the current app-shell markup into `apps/web/app/routes/layout.tsx`, then delete the shared `AppLayout` component, its test, and its export. Update any comments that still describe `AppLayout` as a canonical layout reference so the shared UI package only contains genuinely reusable layout primitives.

**Tech Stack:** React 19, React Router, Vitest, Bun, shared UI package, web route shell.

---

## Chunk 1: Move the shell into the web route

**Files:**
- Modify: `apps/web/app/routes/layout.tsx`
- Reference: `packages/ui/src/components/layout/app-layout.tsx`
- Reference: `docs/superpowers/specs/2026-03-20-app-layout-removal-design.md`

- [ ] **Step 1: Add or adapt a failing assertion around the route shell if needed**

If existing web coverage already exercises the route shell sufficiently, keep this step minimal and rely on the web test suite. Otherwise add a focused assertion that the route still renders the header and main content in the expected structure after the inline move.

- [ ] **Step 2: Run the relevant web test to establish the current baseline**

Run:
`bun run --filter @hominem/web test`

Expected: PASS before the move.

- [ ] **Step 3: Inline the shell markup into `apps/web/app/routes/layout.tsx`**

Replace:

```tsx
<AppLayout navigation={<NotesHeader />}>
  <Suspense fallback={<LoadingScreen />}>
    <Outlet />
  </Suspense>
</AppLayout>
```

with the equivalent local shell structure:

- navigation progress indicator using `useNavigation()`
- `NotesHeader`
- the existing `main` container and width constraint

Keep the route behavior unchanged.

- [ ] **Step 4: Run the web test suite again**

Run:
`bun run --filter @hominem/web test`

Expected: PASS.

- [ ] **Step 5: Commit the route-shell move**

```bash
git add apps/web/app/routes/layout.tsx
git commit -m "refactor(web): inline app shell"
```

## Chunk 2: Delete the shared `AppLayout` surface

**Files:**
- Delete: `packages/ui/src/components/layout/app-layout.tsx`
- Delete: `packages/ui/src/components/layout/app-layout.test.tsx`
- Modify: `packages/ui/src/components/layout/index.ts`

- [ ] **Step 1: Remove the `AppLayout` export**

Delete:

```ts
export { AppLayout } from './app-layout'
```

from `packages/ui/src/components/layout/index.ts`.

- [ ] **Step 2: Delete the obsolete component and test**

Remove:

- `packages/ui/src/components/layout/app-layout.tsx`
- `packages/ui/src/components/layout/app-layout.test.tsx`

These are no longer valid after the web route owns the shell.

- [ ] **Step 3: Run UI typecheck to catch leftover references**

Run:
`bun run --filter @hominem/ui typecheck`

Expected: PASS, or surface any remaining imports/exports that still reference `AppLayout`.

- [ ] **Step 4: Commit the shared-surface removal**

```bash
git add packages/ui/src/components/layout/index.ts
git rm packages/ui/src/components/layout/app-layout.tsx packages/ui/src/components/layout/app-layout.test.tsx
git commit -m "refactor(ui): remove app layout"
```

## Chunk 3: Clean up remaining references and verify the repo

**Files:**
- Modify: `packages/ui/src/components/layout/page.tsx`
- Modify: `packages/ui/src/components/layout/page-container.tsx`
- Reference: `packages/ui/src/components/layout/index.ts`

- [ ] **Step 1: Update comments that still reference `AppLayout`**

Replace references like:

- `matches AppLayout canonical constraint`

with direct wording such as:

- `matches the shared max-w-5xl content constraint`

- [ ] **Step 2: Run package and app typechecks**

Run:
`bun run --filter @hominem/ui typecheck`
`bun run --filter @hominem/web typecheck`

Expected: PASS.

- [ ] **Step 3: Run the web tests and repo safety check**

Run:
`bun run --filter @hominem/web test`
`bun run check`

Expected: PASS.

- [ ] **Step 4: Commit the reference cleanup**

```bash
git add packages/ui/src/components/layout/page.tsx packages/ui/src/components/layout/page-container.tsx docs/superpowers/specs/2026-03-20-app-layout-removal-design.md docs/superpowers/plans/2026-03-20-app-layout-removal.md
git commit -m "chore(ui): remove app layout references"
```
