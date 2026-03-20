# Focus List Design

Date: 2026-03-20
Area: `apps/mobile/components/workspace`, future shared list patterns for mobile, desktop, and web

## Goal

Define one cross-platform list design language for focus items, chats, and adjacent list surfaces that closely follows Apple Notes: airy page framing, grouped rounded section containers, and internal rows separated by dividers instead of standalone bordered cards.

## Problems To Solve

- The current focus list treatment relies on per-item borders, card spacing, and container padding that make the list feel fragmented.
- A flat continuous list still misses the stronger Apple Notes pattern, where items live inside grouped section sheets rather than floating independently.
- Notes and chats appear in the same workspace stream, but the current presentation does not yet feel like one coherent list system.
- Metadata currently risks taking up more attention than it deserves for a notes-first product.

## Non-Goals

- No schema, RPC, or routing changes.
- No redesign of note detail or chat detail screens.
- No dense preview snippets by default.
- No separate structural pattern for notes versus chats.

## Decision

Use a shared Apple Notes-style grouped list pattern across mobile, desktop, and web.

The page should feel open and soft. Rows should not appear as independent cards. Instead, each logical section should render as a rounded white sheet, and each item should render as a row inside that sheet with thin internal dividers.

This means:

- section containers provide the visual grouping
- rows inside sections are simple and borderless
- title is the dominant content
- metadata is quiet and stacked under the title
- snippets stay off by default

## Core Structure

Every list surface should be built from the same hierarchy:

1. Page background with generous outer breathing room.
2. Optional section heading such as pinned, notes, or a future grouping label.
3. Rounded section surface.
4. Rows inside that surface with internal dividers.

This is the main shift from the earlier continuous-sheet idea: the dominant container is the section, not the entire list.

## Section Containers

Section containers should feel very close to Apple Notes:

- white or elevated surface against a softer page background
- large rounded corners
- no visible per-row border around the outside edge
- clipped internal dividers
- enough inset to feel calm, not cramped

Pinned content should be allowed to live in its own dedicated rounded container. Regular notes and mixed stream content should live in a larger rounded container below.

## Row Model

Every row should use the same base structure:

1. Primary title line.
2. Quiet metadata line directly beneath it.
3. Tiny source or type line beneath the metadata when needed.

Rows should not look like their own cards. Their identity comes from typography and the section surface around them.

Notes and chats should share the same row skeleton. Type differences should come from small icon or label changes, not from a different component shape.

## Typography

Typography should closely follow the screenshot reference:

- title is bold and visually dominant
- metadata line is medium-small and gray
- source/type line is smallest and quietest
- snippet text is omitted unless absolutely necessary

The default row should be title plus metadata, not title plus excerpt.

## Metadata

Metadata should sit under the title, not dominate the trailing edge.

Guidelines:

- timestamp belongs in the metadata line
- any secondary label should read as supporting information, not a badge
- source/type should be tiny and very quiet
- metadata should never feel louder than the title

This is more faithful to Apple Notes than a title-left, timestamp-right dominant row.

## Spacing And Density

The target is close to Apple Notes:

- page has generous top and side breathing room
- section headings float above the section surface
- section surfaces use calm internal padding
- rows have comfortable vertical spacing
- dividers sit between rows with consistent insets

The design should feel relaxed, native, and obviously list-based, but not loose enough to waste screen space.

## Interaction Model

Interaction should stay subtle:

- row press/hover states should lightly tint within the section surface
- selected/active states should read as filled state changes, not borders
- swipe, context menu, and secondary actions should attach to the row without changing the structural design

Rows should still feel like part of one grouped surface when interacted with.

## Notes And Chats

Notes and chats should use the same primitive.

Shared:

- same section container pattern
- same row padding
- same title and metadata hierarchy
- same divider behavior
- same interaction treatment

Variable:

- icon glyph or source label
- route behavior
- special status indicator only when required

This preserves one product language across all list surfaces.

## Empty And Transitional States

Empty states should match the grouped Apple Notes approach:

- no bordered empty card
- no detached callout box unless the surface genuinely needs one
- use simple copy inside the page flow or inside a calm section shell

Loading and insertion states should animate within section containers rather than as detached card blocks.

## Accessibility

- rows must retain comfortable touch targets
- section grouping should remain clear in screen-reader order
- title content must remain readable at a glance
- metadata contrast should stay accessible even if visually quiet
- type cues should not depend on color alone

## Implementation Boundaries

Start with the shared workspace stream row and list container on mobile and web.

The first implementation pass should:

1. Replace per-item bordered cards with grouped rounded section containers.
2. Move row hierarchy closer to Apple Notes: title, metadata, then source/type.
3. Keep snippets off by default.
4. Keep note and chat rows on the same primitive.
5. Reuse the same section-container and row logic across platforms.

## Testing Strategy

- update component tests that depend on row and section structure
- verify rows still navigate correctly for both notes and chats
- verify section containers replace standalone card treatment
- verify title and metadata hierarchy stays intact without default snippets
- verify interactive states still work inside grouped surfaces

## Risks

- copying Apple Notes too literally can create awkward fit with mixed note/chat content
- over-grouping can make the list feel heavier if section spacing is wrong
- subtle metadata can become too faint if contrast is pushed too far
- different platform chrome can tempt unnecessary divergence from the shared pattern

## Implementation Outline

1. Refactor list containers to render grouped rounded section surfaces.
2. Refactor rows to use title-plus-stacked-metadata hierarchy.
3. Remove remaining standalone card chrome.
4. Align mobile and web surfaces to the same grouped Notes pattern.
5. Tune interaction states without breaking the grouped-shell illusion.
