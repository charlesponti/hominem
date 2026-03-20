# Focus List Design

Date: 2026-03-20
Area: `apps/mobile/components/workspace`, `apps/web/app/components`, future shared list patterns for mobile, desktop, and web

## Goal

Define one minimal, native-feeling list system for notes and chats that works across mobile, desktop, and web without relying on per-item cards, badges, or heavy chrome.

## Product Job

The list exists to help people scan and recognize items quickly.

That means the design must prioritize:

- fast recognition
- stable vertical rhythm
- minimal chrome
- calm grouping
- native-feeling interaction

Beauty should come from spacing, hierarchy, and restraint rather than decoration.

## Problems To Solve

- The current list treatments spend too much visual weight on containers, borders, or extra row signals.
- Notes and chats do not yet feel like one coherent cross-platform list language.
- The interface has drifted toward reference-copying rather than solving the app’s actual scanning problem.
- Metadata and type cues have taken up more space than they deserve.

## Non-Goals

- No schema, RPC, or route changes.
- No separate row architecture for notes and chats.
- No default snippets or excerpts.
- No badge-heavy or label-heavy type indicators.
- No attempt to mimic a specific third-party screenshot literally.

## Decision

Use a grouped native list pattern.

The page gets a soft background. Content lives in rounded list groups. Rows inside those groups are simple and quiet: one tiny leading icon, one strong title line, and one metadata line. Notes and chats share the exact same row structure.

This should feel native on mobile and still read as restrained and intentional on desktop and web.

## Core Principles

### 1. One Row Primitive

Notes and chats should use the same row layout everywhere.

They should differ only by:

- icon
- destination
- rare exceptional state treatment

They should not differ by shape, spacing, or row structure.

### 2. One Type Cue

The row gets one small cue for note versus chat: a tiny leading icon.

Do not add:

- source words
- badges
- pills
- duplicate cues in metadata

### 3. Title First

The title is the primary scanning target.

Rules:

- single line by default
- strongest contrast in the row
- semibold but not oversized
- no competing text at the same emphasis

### 4. One Metadata Line

Each row gets one quiet metadata line beneath the title.

That line should hold:

- timestamp first
- at most one extra fragment in the future if the product truly needs it

The metadata line should never become a mini-dashboard.

### 5. Group the Surface, Not the Row

The section container is the design object.

Rows are content inside that object.

That means:

- grouped rounded containers
- inset dividers
- no per-item borders
- no floating row cards
- no visual need for every row to announce itself separately

## Visual Structure

The full list should read like this:

1. Soft page background
2. Section heading only when needed
3. Rounded grouped container
4. Rows with inset dividers

The list should feel airy, but not spacious to the point of inefficiency.

## Spacing

Spacing should feel deliberate and stable:

- page padding gives the content room to breathe
- grouped containers sit comfortably within the page
- row padding is generous enough for touch but compact enough for scanning
- divider inset starts at the text column, not the icon edge
- repeated row rhythm matters more than dramatic spacing moments

## Typography

Typography should do most of the work.

Title:

- primary text color
- semibold
- compact line height

Metadata:

- secondary text color
- smaller than title
- one line

Avoid adding a third text line in the default state.

## Color And Surfaces

- page background should be softer than the grouped container
- grouped container should read as a clean content surface
- pressed, hover, and selected states should be soft fills
- dividers should be subtle and quiet

The palette should feel native and calm, not glossy or high-contrast.

## Interaction

- hover and pressed states should gently tint the row
- selection should be visible but restrained
- rows should remain visually stable during scrolling
- context menus or swipe actions should layer on top of the row pattern, not change it

## Notes And Chats

Shared:

- same grouped container model
- same row spacing
- same title/meta hierarchy
- same interaction treatment

Different:

- icon glyph
- route behavior

That is enough.

## Empty States

Empty states should follow the same philosophy:

- grouped, calm, and simple
- no loud bordered callout
- no extra illustration unless truly necessary

## Design-System Changes

The design system should explicitly support this list pattern:

- grouped list page background token
- grouped list surface token
- grouped list radius token
- row horizontal padding token
- row vertical padding token
- divider inset token
- leading icon size/color token
- title/meta emphasis tokens

This is a system primitive, not a one-off screen treatment.

## Implementation Boundaries

The first implementation pass should:

1. Update the shared notes/list tokens to support grouped native lists.
2. Refactor the mobile focus stream to the new grouped row primitive.
3. Refactor the web notes/chat sidebar to the same primitive.
4. Keep notes and chats structurally identical.
5. Keep snippets off by default.

## Testing Strategy

- verify the shared tokens describe grouped list behavior
- verify notes and chats keep the same row structure
- verify source words do not reappear
- verify metadata remains one line
- verify grouped surfaces replace row-card treatment
- verify mobile and web still navigate correctly

## Risks

- over-styling can break the minimal-native goal
- under-styling can make the list feel unfinished
- adding more than one type cue will make the system busy quickly
- platform-specific improvisation can fragment the shared pattern

## Implementation Outline

1. Codify grouped-native list tokens.
2. Simplify row content to icon, title, metadata.
3. Remove any remaining source words, badges, or extra row signals.
4. Move grouping responsibility to section containers.
5. Tune spacing and divider insets until the list feels calm and fast to scan.
