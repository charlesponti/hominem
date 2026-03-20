# Focus List Design

Date: 2026-03-20
Area: `apps/mobile/components/workspace`, future shared list patterns for mobile, desktop, and web

## Goal

Define one cross-platform list-row design language for focus items, chats, and adjacent list surfaces that replaces bordered cards with a calmer continuous list inspired by Apple Notes.

## Problems To Solve

- The current focus list treatment relies on per-item borders, card spacing, and container padding that make the list feel fragmented.
- The same visual pattern does not scale well across mobile, desktop, and web because it spends too much visual weight on chrome instead of content.
- Notes and chats appear in the same workspace stream, but the current presentation does not yet feel like one coherent list system.
- Metadata currently risks taking up more attention than it deserves for a notes-first product.

## Non-Goals

- No schema, RPC, or routing changes.
- No redesign of note detail or chat detail screens.
- No introduction of dense preview snippets by default.
- No platform-specific row systems that diverge structurally.

## Decision

Use a shared continuous-surface row pattern across mobile, desktop, and web.

Each item should appear as a row inside one list surface, not as an independent card. The title is the primary content. Metadata is present but quiet. Snippets are hidden by default and should appear only when the title alone cannot sufficiently identify the item.

This is closest to Apple Notes in structure, but slightly more relaxed in vertical rhythm so the list feels more deliberate and touch-friendly across platforms.

## Core Row Model

Every list item should use the same base structure:

1. Leading area for an optional subtle type cue.
2. Central content area with the title as the dominant element.
3. Trailing metadata area with low-emphasis timestamp or equivalent state.

The structure should stay the same for notes and chats. Type differences should come from small icon or metadata changes, not from separate card layouts.

## Visual Structure

The list should feel like one uninterrupted surface:

- no per-item borders
- no floating cards
- no outer row capsules
- no large inter-item gaps pretending to be section breaks

Separation should come from:

- thin dividers
- row padding
- typography hierarchy
- interaction states

The list container may still have its own page-level padding, but the rows themselves should read as part of one continuous sheet.

## Spacing And Density

The target density is slightly more relaxed than Apple Notes, while preserving fast scanning.

Guidelines:

- row height should feel comfortable for touch on mobile
- vertical padding should create breathing room without becoming card-like
- horizontal padding should align all rows to a strict shared rhythm
- divider insets should align with the text column, not span edge to edge unless required by the platform

The result should feel clean and calm, not minimal to the point of looking unfinished.

## Typography

Title-first hierarchy should drive the row:

- title is always the strongest text element
- title should generally remain one line in default list mode
- metadata should be smaller and lower contrast
- snippet text should be omitted in the default state

If a snippet is required, it should be a rare fallback and should remain visually subordinate to the title.

## Metadata

Metadata should stay quiet and compact:

- timestamps should be trailing and low emphasis
- note or chat type cues should be subtle
- metadata should never overpower the title
- rows should remain useful even when metadata is hidden or delayed

Avoid badge-heavy or label-heavy treatments. The list should not read like a dashboard table.

## Interaction Model

Interactivity should come from the row state rather than extra chrome.

Across platforms:

- hover should lightly tint the row on pointer platforms
- press should slightly darken or soften the row on touch platforms
- selected or active states should be visible through background treatment, not borders
- swipe, context menu, and secondary actions should attach to the row without changing its base layout language

Rows should feel responsive and native, but still visually restrained.

## Notes And Chats

Notes and chats should use the same primitive.

Shared:

- same row height system
- same padding
- same title styling
- same divider treatment
- same interaction states

Variable:

- icon glyph
- timestamp label if needed
- route behavior

This preserves a single product language while still allowing users to distinguish item types when they need to.

## Empty And Transitional States

Empty states should follow the same design philosophy as the list:

- avoid bordered empty cards when possible
- use spacing and typography before decoration
- keep the message direct and calm

Loading, refresh, and insertion states should animate within the continuous list surface rather than feeling like disconnected blocks.

## Accessibility

- rows must retain comfortable touch targets
- title content must remain readable at a glance
- metadata contrast should remain accessible even if visually quiet
- row states must be communicated without relying on borders alone
- type cues should not depend on color alone

## Implementation Boundaries

Start with the shared workspace stream row and the list container that renders it. Treat that implementation as the reference pattern for future list surfaces on mobile, desktop, and web.

The first implementation pass should:

1. Replace bordered-card rows with continuous-surface rows.
2. Establish divider, padding, and state behavior.
3. De-emphasize metadata.
4. Remove the default snippet line.
5. Keep note and chat rows on the same primitive.

Follow-up list surfaces should reuse this language rather than reinterpreting it.

## Testing Strategy

- update component tests that depend on row structure
- verify rows still navigate correctly for both notes and chats
- verify metadata remains present but visually secondary
- verify the list works without snippets in the default state
- verify hover, press, and selection states remain legible across platforms

## Risks

- removing too much structure could make the list feel plain rather than refined
- excessive vertical spacing could accidentally recreate the feel of detached cards
- overusing icons or metadata could undermine the title-first hierarchy
- implementing separate platform tweaks too early could fragment the shared design language

## Implementation Outline

1. Refactor the current workspace stream row into a continuous-surface row primitive.
2. Update list container spacing and separators to support the new rhythm.
3. Remove default snippet rendering and rebalance metadata.
4. Tune interaction states for touch and pointer environments.
5. Reuse the same pattern for adjacent list surfaces on each platform.
