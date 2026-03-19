## Context

The current mobile app splits the product across three primary routes: `start` for prompt suggestions, `focus` for notes and recent sessions, and `sherpa` for chat. Each route owns or depends on its own input behavior (`CaptureBar`, `InputDock`, or route-local `ChatInput`), which creates duplicate state, fractured navigation, and an experience that does not match the intended notes-first assistant workspace.

The approved product direction is one shared mobile workspace where notes and chats live in a continuous stream. `Inbox` is the canonical home, while `Note`, `Chat`, `Search`, and `Settings` are contexts in the same shell. A single shell-mounted HyperForm owns draft text, attachments, and voice capture and changes posture based on the active context.

Constraints:
- Mobile is implemented with Expo Router and React Native, not the web Notes shell
- Existing mobile services already cover note creation, chat start/send, attachments, and voice transcription
- The design should maximize state consolidation and avoid introducing duplicate input or stream models

## Goals / Non-Goals

**Goals:**
- Create one protected mobile workspace shell with top context navigation
- Make `Inbox` the default surface and render a unified chronological stream of notes, chat activity, assistant output, and attachments
- Mount one mobile HyperForm at the shell level and remove duplicate route-local input ownership
- Preserve draft state across context switches and focused note/chat views
- Keep note writing and chat visually distinct while still belonging to one workspace

**Non-Goals:**
- Redesign mobile backend contracts unless the unified stream exposes a hard API gap
- Build desktop/web parity by sharing route structure verbatim
- Expand `Settings` beyond the shell/header/composer visibility behavior needed for this workspace change
- Introduce a second creation surface or parallel composer implementation

## Decisions

### 1. Use a shell-owned workspace context model
The protected mobile layout will own the active workspace context (`Inbox`, `Note`, `Chat`, `Search`, `Settings`) and mount shared UI that survives route changes. This keeps navigation, draft state, and composer behavior in one place.

Alternative considered: keep route-local ownership and sync state through params or query cache. Rejected because it preserves duplication and makes draft persistence fragile.

### 2. Make `Inbox` the canonical home instead of keeping `focus` and `start` as peer destinations
The current `focus` surface already contains notes and recent sessions, so it is the best base for the unified stream. `start` intent suggestions can be folded into `Inbox` empty states or quick actions instead of remaining a separate top-level product area.

Alternative considered: retain three peer destinations and add a shared composer across them. Rejected because it keeps the mental model fragmented and undercuts the continuous-stream vision.

### 3. Converge capture, note drafting, and chat reply into one HyperForm state contract
The current `InputContext` only tracks text and recording mode. It will expand into a draft contract that owns text, attachments, recording state, and the active context metadata needed to compute actions and placeholders.

Alternative considered: keep separate state slices for chat and capture. Rejected because it duplicates business rules and makes transitions between note and chat modes harder to reason about.

### 4. Treat note and chat as focused context views over the same stream
`Chat` remains a dedicated conversational reading/writing surface and `Note` remains a drafting-first authoring surface, but both are entered from the shared stream and return to it without changing product boundaries.

Alternative considered: flatten everything into one infinite mixed feed with inline expansion only. Rejected because long-form writing and conversation need stronger focused views for usability.

### 5. Reuse existing service hooks and optimistic React Query patterns
Stream freshness and composer actions should build on the existing mobile services and query invalidation patterns rather than introducing new client-side state systems. Any new stream aggregation should still resolve to a single source of truth per feature.

Alternative considered: add a separate local timeline store. Rejected because it would conflict with the existing mobile state-consolidation direction.

## Risks / Trade-offs

- [Route migration complexity] → Merging `start`, `focus`, and `sherpa` into one shell can create awkward deep-link behavior; mitigate by keeping focused route entry points but rendering them as shell contexts
- [Stream model ambiguity] → Notes, chat sessions, assistant turns, and attachments may not share one existing API shape; mitigate by defining a typed mobile stream item adapter before rewriting screens
- [Composer scope creep] → A single HyperForm can become too generic; mitigate by keeping context-specific posture and actions while enforcing one state owner
- [Search interaction overlap] → Reusing the same input for search and creation could confuse intent; mitigate by making `Search` an explicit context with query-first placeholder, filters, and disabled create/send actions
- [Settings edge case] → A shell-mounted composer may appear where it is not useful; mitigate by explicitly hiding or minimizing it in `Settings`

## Migration Plan

1. Add the shared mobile workspace context model and shell-owned HyperForm draft provider.
2. Build the top context header and shell mount point while keeping current routes functional.
3. Convert `focus` into `Inbox` and adapt existing notes/session content into a chronological mixed stream.
4. Move `sherpa` chat input ownership into the shell HyperForm and keep the transcript view focused on rendering.
5. Introduce focused `Note` and `Search` contexts that reuse the same draft and navigation model.
6. Remove retired mobile input components and update route tests/e2e expectations.

Rollback strategy: restore route-local composer ownership and previous tab destinations if the shell integration causes navigation or state regressions.

## Open Questions

- Whether the unified stream can be composed entirely from existing queries or needs a dedicated aggregated endpoint
- Whether `start` survives as a lightweight onboarding-only route or disappears completely after `Inbox` absorbs its role
- The final visual treatment for the top context switcher on narrow devices while preserving safe-area space for the HyperForm
