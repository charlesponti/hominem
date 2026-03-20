# App Layout Removal Design

Date: 2026-03-20
Area: `packages/ui/src/components/layout/app-layout.tsx`

## Goal

Remove `AppLayout` from `@hominem/ui` and move the web app shell into the web app, since there is only one web app and one desktop app and the shell is not a meaningful shared primitive.

## Problems To Solve

- `AppLayout` now represents app-specific shell structure rather than reusable UI.
- Keeping it in `packages/ui` creates fake reuse and couples product shell decisions to the shared package.
- There is only one real `AppLayout` consumer, so the abstraction cost now outweighs its value.

## Non-Goals

- No redesign of the web app shell itself.
- No desktop shell work in this pass.
- No changes to the low-level reusable layout primitives in `@hominem/ui`.

## Recommended Approach

Inline the current `AppLayout` behavior into the web app and delete the shared component, export, and tests.

The web route shell should own:

- navigation progress indicator
- top header placement
- main content container

Shared UI should keep only generic layout primitives.

## Architecture

Move the shell logic from `packages/ui/src/components/layout/app-layout.tsx` into a web-local shell component or directly into `apps/web/app/routes/layout.tsx`.

Delete:

- `packages/ui/src/components/layout/app-layout.tsx`
- `packages/ui/src/components/layout/app-layout.test.tsx`
- `AppLayout` export from `packages/ui/src/components/layout/index.ts`

Update the web route to render the shell locally.

## Migration Shape

This should remain small because current usage is limited to:

- `apps/web/app/routes/layout.tsx`

Supporting comments in `page.tsx` and `page-container.tsx` that reference `AppLayout` as a canonical constraint should be updated to describe the container width directly rather than referencing the deleted component.

## Testing Strategy

Keep verification focused:

- remove or replace the obsolete `AppLayout` unit test
- run the web tests that cover the route shell
- run typecheck to catch any leftover `AppLayout` imports or exports

## Verification

Before completion:

- run `@hominem/web` tests
- run `@hominem/ui` and `@hominem/web` typecheck
- run repo safety checks

## Risks

- comments or docs may still describe `AppLayout` as a canonical pattern after removal
- the route shell may grow unless it is kept tight during the move

## Implementation Outline

1. Add or adapt tests around the web route shell if needed.
2. Move the shell structure into the web app.
3. Delete `AppLayout`, its test, and its export.
4. Update remaining references and run verification.
