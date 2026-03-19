# Note Editing Sheet Design

## Summary

The mobile note editor should feel like a focused bottom sheet rather than a generic modal page. The design goal is a balanced editor: strong enough for longer writing, light enough for quick edits, and clear about where metadata ends and the note body begins.

## Goals

- Make the note body the primary visual surface.
- Keep supporting metadata visible without competing with the writing area.
- Use sheet chrome that signals transient, focused editing.
- Preserve the current route structure and keep implementation risk low.

## Non-Goals

- Reworking note storage or RPC contracts.
- Adding a large formatting toolbar.
- Turning the editor into a full document workspace.
- Changing inbox or chat behavior.

## Decision

Use a two-tier sheet layout:

1. A compact sheet header with a grabber, note title, and short supporting copy.
2. A dominant editor card for the note body.
3. A secondary metadata card below it for due date and future note metadata.
4. A sticky action area with a single primary save action.

This keeps the sheet balanced. The writing area stays dominant, but metadata still has a clear home and can grow later without cluttering the editor itself.

## Layout

The sheet should open with clear bottom-sheet cues:

- Rounded top corners
- Visible handle/grabber
- Tight vertical spacing
- Slightly elevated surface treatment against the app background

Inside the sheet, the content should read top to bottom:

1. Header
2. Editor card
3. Metadata card
4. Action row

The editor card should have the highest contrast and largest touch target. Metadata should use smaller type and tighter spacing so it remains subordinate.

## Interaction Model

- Tapping the note body focuses the editor immediately.
- Due date should be obvious and editable as an inline control, not hidden behind plain text.
- Save remains the primary action.
- Dismissal should follow the existing sheet or modal pattern for this route, with no extra navigation complexity.

## Visual Hierarchy

- The note title and editor body should carry the most visual weight.
- Supporting copy should be short and quiet.
- Metadata should feel like configuration, not content.
- The save action should be the clearest control in the footer, but not louder than the note body.

## Accessibility

- Maintain clear labels for the editor, metadata control, and save action.
- Ensure the sheet can be navigated in a logical order by screen readers.
- Keep touch targets comfortable, especially for the due date control.

## Testing

- Verify the sheet renders with the expected hierarchy on mobile.
- Verify the editor remains the dominant surface.
- Verify metadata controls stay visible and accessible when a due date exists.
- Verify the save action remains reachable without excessive scrolling.

## Implementation Boundaries

- The sheet should stay within the existing focus/note route area.
- Reuse existing button, text input, and theme primitives where possible.
- Keep the change small enough to avoid spillover into inbox or chat surfaces.

