## Context

The Notes web app uses a shared `AppLayout` that centers page content in a `max-w-5xl` wrapper, applies document-style horizontal padding, reserves bottom space for the mobile tab bar, and hides the fixed top header on scroll-down. Those defaults work for list, form, and detail pages, but the chat route is a different surface: it needs persistent context, predictable composer placement, stable search overlays, and a tighter readable thread width.

The current `chat/:chatId` route stacks a context strip, message thread, action row, and composer inside the shared shell. That produces three layout problems:
- the chat page inherits document constraints that are too wide on desktop and too padded on mobile
- secondary actions permanently occupy vertical space even though they are not primary tasks
- search appears in document flow, which changes the thread layout and weakens return-to-context behavior

This change is intentionally scoped to the Notes chat route and its immediate shell interactions. It does not redesign the home capture composer or change backend chat/message contracts.

The shared UI layer and the mobile chat screen also shape this experience today. The current shared `Message` primitive in `packages/ui` assumes all roles render as bubbles, and the mobile chat screen independently mirrors that bubble-first model. If the redesign only adjusts the Notes web route, the product immediately drifts across platforms and route components are forced to style around the wrong primitive semantics.

## Goals / Non-Goals

**Goals:**
- Make `chat/:chatId` feel like a dedicated conversation surface rather than a generic page
- Preserve the shared app shell while allowing the chat route to opt into its own inner layout geometry
- Consolidate secondary actions into a single header dropdown
- Provide search as a dismissible overlay that does not disturb the conversation state
- Add a debug toggle that exposes deeper message metadata only when requested
- Keep the note-classification review flow compatible with the new surface on mobile and desktop

**Non-Goals:**
- Redesign the Notes home page or revive the dormant `CaptureBar` in this change
- Introduce a desktop split-view artifact editor or side panel
- Change chat backend contracts, storage, or model orchestration
- Rework voice capture, attachments, or note editing beyond what is necessary for layout consistency

## Decisions

### 1. The chat route gets a route-local layout boundary
The chat route SHALL render through a dedicated `chat/layout.tsx` boundary so it can override the default content geometry of the shared app shell without forking the whole Notes app layout.

Why:
- `AppLayout` remains the canonical shell for navigation, tab-bar spacing, and top-level structure
- the chat surface needs different width and padding rules than note/document pages
- route-local override is lower risk than changing the global shell for all pages

Alternatives considered:
- Override spacing entirely from `chat.$chatId.tsx`: simpler at first, but keeps shell assumptions implicit and fragile
- Fork `AppLayout` for Notes chat only: too heavy and increases shell divergence

### 2. The chat surface remains single-column at all breakpoints
The conversation thread SHALL remain single-column on mobile and desktop, with width behavior that changes by breakpoint:
- mobile: full-width thread with compact horizontal padding
- tablet: centered thread with a tighter readable max width
- desktop: centered thread with a slightly wider, but still constrained, max width

Why:
- the product goal is a clean ChatGPT/Claude-like surface, not a dashboard
- a split view would weaken the primary reading/writing loop and add coordination complexity
- classification review is already overlay-oriented and does not require a persistent second pane

Alternatives considered:
- persistent right-side artifact preview: increases complexity without supporting the core send/read loop
- unconstrained full-width desktop thread: reduces readability and makes prose-heavy messages harder to scan

### 2A. The redesign defines a shared cross-platform chat presentation contract
The Notes chat redesign SHALL define a shared presentation contract across web and mobile rather than a web-only styling pass. The canonical contract SHALL live in the shared UI layer and be expressed through shared chat semantics, tokenized spacing and surfaces, and web reference primitives. Mobile SHALL implement a native equivalent that matches the same contract.

The shared contract SHALL define:
- turn presentation by role
- transcript width and spacing behavior
- composer structure
- suggestion-chip hierarchy
- metadata hierarchy
- debug-block posture
- search overlay posture

Why:
- the Notes chat surface is a product-level interaction, not a route-local visual exception
- web-only changes would immediately drift from the mobile experience
- the current shared UI primitives already shape chat presentation, so the design intent must be captured at that layer

Alternatives considered:
- redesign web Notes only and let mobile follow later: fastest locally, but guarantees drift
- keep design decisions only in route components: too fragile and duplicates presentation logic across platforms
- fully share DOM components with mobile: not viable, because native surfaces need their own implementation while still matching the same contract

### 3. Chat-local controls move into a sticky local header
The route SHALL replace the current context strip and action band with a sticky chat-local header containing:
- back/navigation affordance
- session/source title
- a single overflow dropdown for secondary actions

Why:
- this keeps the vertical stack focused on thread + composer
- users retain constant access to context without a second full-width action row
- actions are discoverable but no longer dominate the surface

Alternatives considered:
- keep the action strip below messages: too visually expensive for infrequent actions
- move actions into the global app header: mixes app-shell concerns with route-local actions

### 3A. The composer must be a single-surface structure across platforms
The chat composer SHALL be a single-surface interaction across web and mobile. It SHALL contain:
- an optional lightweight suggestions row when empty
- a primary input region
- a secondary footer region for tools and status
- attachment previews within the same composer system

The composer SHALL not be represented as stacked panels or nested card treatments. Mobile MAY use platform-appropriate control sizing and safe-area adjustments, but SHALL preserve the same hierarchy and emphasis model.

Why:
- the composer is the primary writing affordance and should feel stable and unified
- stacked surfaces make the footer compete with the transcript
- parity requires the same interaction hierarchy even if the host platform differs

Alternatives considered:
- independent composer designs per platform: increases divergence and weakens product identity
- generic form-field composition: too weak for a dedicated chat surface
- highly decorative composer treatments: conflict with the monotone light design system and overpower the transcript

### 4. Search becomes an overlay, not a layout row
Message search SHALL be rendered as an overlay anchored to the chat surface rather than inserted into document flow.

Why:
- dismissing search should return the user to the exact same thread state
- the thread should not jump when search opens or closes
- this aligns with the intended “temporary lens” interaction rather than a mode shift

Alternatives considered:
- inline search row in the thread: simple to build, but causes layout shift and weakens state continuity
- full-screen search modal: too disruptive for in-conversation recall

### 5. Debug information is additive and opt-in
The default message presentation SHALL remain reader-friendly. `Show debug` in the header dropdown SHALL reveal deeper diagnostics inline per message, such as exact timestamp, message id, raw role, streaming state, tool-call presence, and other available low-level metadata.

Why:
- the current message UI already exposes lightweight annotations like speaker and formatted timestamp
- debug mode should reveal genuinely additional information rather than duplicate the default presentation
- keeping it inline preserves conversational context while inspecting metadata

Alternatives considered:
- separate debug drawer: adds unnecessary navigation for a developer-oriented feature
- always-visible debug rows: clutters the primary reading experience

### 5A. Shared chat primitives must model transcript rows, not universal bubbles
Shared chat primitives SHALL model a role-based transcript system rather than treating every message as the same bubble shape. The contract SHALL support three presentation modes:
- assistant transcript row
- user compact bubble
- system inline utility row

Assistant turns SHALL render as transcript content rows without default bubble chrome. User turns SHALL render as compact aligned bubbles with a single surface. System turns SHALL render as low-emphasis inline utility rows.

This applies to:
- shared web primitives in the UI package
- native mobile chat components implementing the same semantics

Why:
- the intended Notes surface is ChatGPT/Claude-like, where assistant content reads like transcript prose and user content reads like intentional compact replies
- the current shared message primitive bakes in bubble treatment for all roles, which forces the wrong structure before route-level styling begins
- layering decorative wrappers around a bubble-first primitive creates the exact failure mode this redesign is trying to remove

Alternatives considered:
- keep a universal bubble primitive and style around it per route: produces nested surfaces and inconsistent spacing
- keep assistant and user structurally identical and vary only color: too blunt for the target reading/writing experience
- solve parity with tokens only: insufficient, because the problem is semantic layout ownership, not just colors and radii

### 6. Classification review stays overlay-based
The classification review surface SHALL remain an overlay interaction:
- bottom-sheet posture on mobile
- centered modal posture on larger breakpoints

Why:
- it matches the current mental model: a temporary review step layered over the conversation
- it avoids introducing a persistent side panel or split view
- the existing dialog already approximates this model and can be refined rather than replaced

Alternatives considered:
- inline review card inside the thread: weakens the modal nature of the accept/reject decision
- desktop side panel: unnecessary for this scoped redesign

### 7. Header scroll-hide must not reduce chat context visibility
The shared top header behavior SHALL be adjusted so chat routes do not lose essential context or navigation affordance due to scroll-hide interactions.

Why:
- the Notes shell header currently hides on scroll-down, which can feel appropriate for browsing pages
- chat is a high-focus surface where persistent orientation matters more than reclaimed vertical space

Alternatives considered:
- leave behavior unchanged: preserves global consistency but hurts chat usability
- disable the shared header entirely on chat routes: too disruptive to app-shell continuity

## Risks / Trade-offs

- [Route-local layout override adds shell complexity] → Keep the override isolated to `chat/layout.tsx` and avoid mutating shared shell behavior except where explicitly required.
- [Search overlay may conflict with virtualized message rendering] → Anchor the overlay outside the scrollable message list and preserve existing search/filter state logic where possible.
- [Debug mode may expose inconsistent metadata availability] → Define a stable minimal debug payload and render absent fields gracefully.
- [Sticky local header plus fixed composer can create cramped mobile vertical space] → Keep both compact, avoid duplicate rows, and validate safe-area behavior on narrow screens.
- [Header behavior changes could unintentionally affect other routes] → Gate any shared-header behavior changes strictly to Notes chat route matching.
- [Shared UI refactor may affect other chat consumers] → Keep the contract explicit and scope any breaking primitive changes behind role-aware variants or narrowly adopted APIs.
- [Web and mobile parity may drift even with shared tokens] → Define shared semantics, not just colors and spacing, and validate both implementations against the same acceptance criteria.
- [Existing bubble-first primitives may be deeply assumed in downstream code] → Migrate by introducing transcript-aware primitives or variants first, then update route and screen consumers.

## Migration Plan

1. Define the cross-platform chat presentation contract in the shared UI layer, including role semantics and chat-specific tokens.
2. Refactor shared web chat primitives so assistant turns render as transcript rows and user turns render as compact bubbles.
3. Create the route-local chat layout and move the Notes web chat page onto the new surface structure.
4. Replace the in-page action strip with a local header dropdown and route-scoped search overlay.
5. Update the mobile chat components to implement the same transcript-row and composer structure natively.
6. Add debug-mode state and render deeper metadata inline in messages on both platforms where applicable.
7. Refine classification review positioning and spacing against the new layout.
8. Validate mobile and desktop rendering, keyboard behavior, safe-area handling, and shell integration.

Rollback strategy:
- Revert the chat route to the existing stack-based layout while retaining the underlying message and mutation logic.
- Because this is UI-only scope, rollback is code-only and does not require data migration.

## Open Questions

- Should debug-mode preference persist across sessions, or only for the current page lifetime?
- Should the header dropdown expose search directly as a menu item, or should search also have a dedicated icon affordance in the local header?
- Do we want the local chat header to include a visible session-state badge during streaming, or is the composer/thread feedback sufficient?
- Should the shared `Message` primitive migrate in place to a transcript-row model, or should the UI package introduce chat-specific variants and move consumers incrementally?
- Do we want a dedicated shared chat-token file for spacing and surfaces, or should chat semantics be expressed as aliases layered on top of the existing base token set?

## Cross-Platform Acceptance Criteria

- assistant turns read as transcript prose, not muted bubbles
- user turns appear as compact aligned bubbles with a single surface
- no message presents a decorative outer container around message content
- search behaves as an overlay rather than a layout row
- the composer reads as one unified surface on web and mobile
- all colors, borders, emphasis, and spacing derive from shared tokens and shared semantic rules
