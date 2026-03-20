# Floating Command Center Design

## Summary

The web app should replace the docked sidebar with a floating command center. We are treating sidebars as a rejected navigation pattern for this product. The new surface should feel intentional, elegant, and portable across routes: open by default on `/home`, hidden by default elsewhere, and summonable from anywhere with a hotkey or visible toggle.

The command center should be command-first. Search and global actions sit at the top. The lower half of the panel changes based on route context, so the same shell can serve home, notes, and chat without duplicating navigation systems.

## Goals

- Replace the docked sidebar with a floating command surface on web.
- Make actions and search the primary navigation model.
- Keep the command center available from any route.
- Open the panel by default on `/home`.
- Hide the panel by default on other routes while preserving fast summon.
- Support keyboard-first interaction, including a summon hotkey and `Esc` to close.
- Keep route-specific context inside the same panel instead of scattering page-specific side modules.
- Prevent overlap conflicts with the Composer across mid-width layouts.

## Non-Goals

- Reworking note, chat, or composer data contracts.
- Redesigning the mobile app navigation model in this pass.
- Building a second navigation system alongside the floating panel.
- Introducing a generic command palette with no visual identity.
- Refactoring unrelated page layouts beyond what is required to remove sidebar assumptions.

## Decision

Use a shared `FloatingCommandCenter` as the primary web navigation shell.

It should be built on the existing shadcn `Command` primitives in `packages/ui/src/components/ui/command.tsx`, but presented as a branded floating command panel rather than a utilitarian modal. The panel becomes:

1. The default open command surface on `/home`.
2. A hidden-by-default summonable surface on all other authenticated routes.
3. The single place for search, global actions, and dynamic route context.

The current docked `Sidebar` usage in the web layout should be removed rather than adapted further.

## Interaction Model

### Open and Close Rules

- `/home` renders the command center open by default.
- Other authenticated routes render it closed by default.
- A persistent floating toggle remains visible so the panel is discoverable without memorizing shortcuts.
- A global summon hotkey opens the panel from anywhere in the authenticated web app.
- `Esc` closes the panel when it is open, unless a nested higher-priority surface already owns escape handling.

### Keyboard Behavior

- Focus moves into the command input when the panel opens.
- Arrow keys navigate command items.
- `Enter` executes the selected command.
- `Esc` closes the panel and restores focus to the last meaningful trigger when possible.
- The summon hotkey must not conflict with Composer text entry in a surprising way.

### Search and Actions

- The top of the panel is always stable:
  - command input
  - global action group
  - navigation/search results
- Dynamic sections appear below those stable groups.
- Search should cover global actions first, then route-aware items.

## Information Architecture

### Stable Top Section

This section is identical everywhere:

- Search input
- New chat
- New note
- Go to home
- Open account
- Open settings
- Recent universal destinations if useful

### Contextual Lower Section

This section changes by route:

- `/home`
  - recent focus items
  - suggested actions
  - recently updated notes or chats
- `/notes/:noteId`
  - note actions
  - related notes
  - note-aware shortcuts
- `/chat/:chatId`
  - chat actions
  - recent sessions
  - attached note context when present

The route contributes data, not layout ownership. The shell stays shared.

## Layout

### Panel Form

The command center should read as a floating command desk, not a drawer and not a standard modal.

Visual direction:

- Elevated floating surface
- Strong but calm silhouette
- Generous top input area
- Layered grouping with clear hierarchy
- Enough translucency or depth to feel detached from the page
- Compact enough to coexist with Composer at medium widths

### Placement

- On `/home`, the panel should live as the dominant floating surface in the main viewport.
- On other routes, it should open in a consistent anchored position that avoids composer overlap.
- It should not consume the full left edge the way a sidebar does.
- It should remain usable from roughly tablet-width desktop upward, especially in the `770px` to `1450px` range where the old sidebar collided with the Composer.

### Responsive Rules

- Desktop and web tablet widths use the floating panel.
- The panel width and position should adapt before it can collide with the Composer.
- On smaller widths where a floating desk becomes cramped, fall back to a dialog-like centered presentation while preserving the same command model.

## Motion

The command center should feel like a composed instrument, not a utility tray.

Motion principles:

- Opening should glide and settle, not snap.
- Closing should feel light and deliberate.
- The panel should subtly separate from the background with depth rather than brute-force scaling.
- If a visible floating toggle exists, it should animate as part of the same family as the panel.
- Respect `prefers-reduced-motion`.

Recommended motion language:

- soft rise/fade on open
- slight settle on final position
- short, quiet close animation
- no theatrical bounces

## State Model

The command center needs a route-aware shell state rather than page-local toggles.

Suggested state:

- `isOpen`
- `lastNonModalFocus`
- `isPinnedHomeDefault`
- `query`
- `contextKey` derived from route

Persistence:

- Remember the preferred open state for `/home` on web.
- Do not force all non-home routes to persist as open by default.
- Route-local open state outside `/home` can stay session-scoped unless we later validate a stronger persistence need.

## Architecture

### Shared UI Layer

Create a reusable floating command center in `packages/ui`.

Responsibilities:

- shared panel shell
- command primitives composition
- open/close behavior
- keyboard handling
- motion
- a slot or prop contract for contextual sections

### Web App Layer

The authenticated web layout should stop passing a sidebar into `AppLayout`.

Instead it should:

- mount the floating command center provider or shell
- provide route-aware context data
- keep the Composer layered independently
- let pages contribute contextual command sections through a narrow contract

### Route Context Contract

Pages should provide structured command content rather than custom UI:

- title or section label
- items
- optional search results
- optional empty states
- handlers or route destinations

This prevents each route from rebuilding panel internals.

## Accessibility

- The command center must expose proper dialog or popover semantics depending on presentation mode.
- Focus must move into the panel on open and return predictably on close.
- `Esc` must close reliably.
- Search input, groups, and items must be screen-reader navigable.
- The floating toggle must have a clear accessible name.
- Reduced motion users should not get the full animated transition.

## Testing

### UI Contract Tests

- `/home` renders the command center open by default.
- non-home authenticated routes render it closed by default.
- summon hotkey opens it.
- `Esc` closes it.
- the floating toggle opens it.
- global action items are present across routes.
- contextual sections change with route.

### Integration Risks to Test

- command center does not overlap the Composer across medium desktop widths
- focus restoration works after close
- query input autofocus works on open
- route changes update contextual content without stale sections

### E2E Coverage

- summon from `/home`
- summon from a note route
- execute “new chat”
- execute “new note”
- close with `Esc`
- verify medium-width layout remains usable

## Migration Plan

1. Introduce the floating command center shell in `packages/ui`.
2. Remove sidebar assumptions from the authenticated web layout.
3. Port current global navigation actions into command items.
4. Map inbox stream or recent items into contextual sections instead of sidebar rows.
5. Make `/home` render the panel open by default.
6. Add route adapters for notes and chat context.
7. Delete the docked web sidebar path once parity is reached.

## Risks

- The new panel could become a crowded “everything surface” if contextual sections are not disciplined.
- Keyboard shortcuts may conflict with existing Composer or browser expectations if chosen poorly.
- Replacing sidebar assumptions may ripple through tests and route shells.
- A floating surface can still collide with Composer unless width, position, and breakpoints are designed together.

## Open Questions

- Which summon hotkey should become the long-term default for the web app?
- Should the floating toggle stay visible on `/home` when the panel is already open, or disappear into the panel chrome?
- Should recent items be mixed directly into search results or remain in a dedicated contextual section?
- At what exact breakpoint should the command center shift from anchored floating desk to centered dialog presentation?
