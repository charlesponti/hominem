## Context

Auth entry screens already share `AuthScaffold`, but route composition is inconsistent. `finance` and `notes` place `/auth/*` under their main `routes/layout.tsx`, which injects app navigation and app-shell side effects into public auth pages. `rocco` already keeps auth routes outside the main shell and serves as the clean baseline.

## Goals / Non-Goals

**Goals:**
- Give all web auth routes the same dedicated route boundary.
- Reuse one shared auth layout component so auth pages align the same way across apps.
- Keep authenticated app layouts focused on signed-in surfaces only.
- Make `react-doctor` runnable from this repo without `npx` override conflicts.

**Non-Goals:**
- Redesigning the visual content of auth forms.
- Reworking mobile auth flows.
- Changing the auth API contract.

## Decisions

### Use a dedicated auth route layout per web app tree

Each web app will expose `/auth/*` outside the main app shell. The route grouping will be made consistent across `finance`, `notes`, and `rocco`.

### Reuse a shared auth route shell component

Shared UI will provide a tiny auth route layout component responsible for rendering shared auth-route concerns like toast support without pulling in app navigation or app-shell spacing rules.

### Keep app-shell concerns out of public auth pages

App-specific authenticated layout logic such as navigation, capture surfaces, passkey enrollment prompts, and URL-driven app toasts stays in the main app layout only.

### Run React Doctor through Bun

The repo will expose a script that uses `bunx` instead of `npx`, avoiding the current override-resolution failure while keeping the tool easy to run from the monorepo root.

## Risks / Trade-offs

- Route tree changes can break redirects if path definitions drift.
  Mitigation: keep absolute auth paths unchanged and run targeted auth tests.
- Moving auth routes may expose assumptions hidden in parent layouts.
  Mitigation: keep the shared auth shell intentionally minimal.

## Migration Plan

1. Add the shared auth route layout component.
2. Restructure `finance` and `notes` auth route groups to live outside the app layout.
3. Move any auth-only shell behavior out of general app layouts.
4. Add the Bun-based `react-doctor` script and verify it runs.

## Open Questions

- None for this scoped fix.
