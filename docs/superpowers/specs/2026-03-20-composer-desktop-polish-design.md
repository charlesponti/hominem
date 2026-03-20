# Composer Desktop Polish Design

Date: 2026-03-20
Area: `apps/web/app/components/composer`

## Goal

Refine the web composer so it feels more intentional, balanced, and native to desktop while staying inside the current restrained visual language and existing design system.

## Problems To Solve

- The composer is functionally solid, but the internal hierarchy still feels flatter than it should.
- The textarea, attachments, note-context chips, tools, and actions currently compete for attention inside one card.
- Tool, action, and disabled states work, but they do not yet feel as deliberate or polished as the rest of the app.
- Uploaded files and attached-note context are clearly separate in behavior, but not yet fully differentiated in visual weight.

## Non-Goals

- No new behavior or workflow changes.
- No backend or API changes.
- No major layout shift outside the current composer footprint.
- No deviation from the existing design system tone.

## Recommended Approach

Apply a presentation-only polish pass to the extracted composer UI pieces, keeping the current structure but improving internal hierarchy, spacing, control states, and attachment presentation.

## Architecture

Limit the work to the presentational composer surface:

- `composer-shell.tsx`
- `composer-tools.tsx`
- `composer-actions-row.tsx`
- `attached-notes-list.tsx`
- `composer-attachment-list.tsx`

The main composer container and action resolver should remain behaviorally unchanged.

## Visual Structure

Refine the shell into clearer layers:

- writing area as the dominant surface
- uploaded files as one secondary band
- attached-note context as a separate secondary band
- footer rail as a quieter control layer

The current card footprint can stay, but spacing and grouping should make each layer easier to scan at a glance.

## Interaction Design

Polish control behavior within the current system:

- tertiary tools should feel calm by default, crisp on hover, and clearly active when engaged
- secondary and primary actions should feel more balanced as a pair
- focus states should feel coherent across textarea, tools, and action buttons
- disabled states should look intentional rather than simply washed out

## Attachment Presentation

Uploaded files should look more like manageable items than generic pills.

Improve:

- spacing
- density
- remove affordances
- error treatment

Attached-note context should remain visually distinct from uploaded files so “assistant context” and “actual attachments” are easier to separate mentally.

## Testing Strategy

Keep verification light and targeted:

- update any component tests needed for changed semantics or labels
- keep the current browser coverage intact
- rely on existing behavior tests to confirm this phase did not alter functionality

## Verification

Before completion:

- run web component tests
- run web typecheck
- run the relevant web browser checks
- run repo safety checks

## Risks

- over-polishing can create visual drift away from the design system
- subtle spacing changes can accidentally make the composer feel busier instead of calmer
- attachment and context bands can become too visually heavy if their styling is overemphasized

## Implementation Outline

1. Add focused tests for any changed semantics.
2. Refine the shell spacing and group hierarchy.
3. Polish tool and action states.
4. Refine uploaded-file and note-context presentation.
5. Run the existing verification set to confirm no behavior changed.
