# Composer Rewrite Design

Date: 2026-03-19
Area: `apps/web/app/components/composer`

## Goal

Rewrite the web composer around a small, explicit action model so the component is easier to reason about, safer to change, and ready for a later visual upgrade. The first pass prioritizes behavior quality, code health, and interaction polish over stylistic reinvention.

## Problems To Solve

- `index.tsx` currently mixes route state, mutation orchestration, keyboard handling, recording state, and presentation.
- Primary and secondary actions are defined through duplicated posture branches, which makes drift and inconsistent cleanup more likely.
- Submit and recording flows rely on local branching instead of a clearer state model.
- Button and tool UI patterns are repeated with small variations.
- The current shell is serviceable but not fully tuned for desktop-level clarity and feedback.

## Non-Goals

- No route model rewrite.
- No major visual redesign in this pass.
- No backend contract changes.
- No speculative attachment feature expansion beyond clarifying current affordances.

## Recommended Approach

Use a behavior-first rewrite of the composer shell.

The composer container should resolve all mode-specific behavior up front and pass a stable view model into smaller presentational pieces. The UI layer should mostly render state and invoke pre-resolved actions rather than branching on posture internally.

This gives the cleanest long-term result while keeping the first pass focused on reliability and maintainability.

## Architecture

### Container

Keep a single top-level composer container responsible for:

- reading route-derived mode from `use-composer-mode`
- reading mutable draft and attachment state from `useComposer`
- owning transient UI state such as `isSubmitting`, `isRecording`, and modal visibility
- wiring mutations and navigation
- resolving the primary and secondary actions for the current posture

### Extracted Pieces

Split the current composer into focused parts:

- `ComposerShell`: outer card, layout, textarea region, and slot structure
- `ComposerTools`: note picker, attachment, camera, and voice controls
- `ComposerActions`: primary and secondary action buttons
- `AttachedNotesList`: attached note tokens and removal behavior
- `composer-actions` helper: resolves action metadata and execute handlers for each posture

The exact filenames can stay close to the existing folder structure, but each unit should own one responsibility and remain easy to scan.

### Action Resolver

Introduce a small action resolver that returns:

- labels
- icon identifiers
- disabled/loading state inputs
- `executePrimary`
- `executeSecondary`

The resolver should use a single sanitized draft value and shared context inputs so all action paths read from the same truth.

This removes duplicated branching across `handlePrimary`, `handleSecondary`, and rendering.

## Behavior Design

### Submission Model

Model submission as a compact state transition:

- `idle`
- `submitting`

Any action execution should early-return when the current draft is not actionable or when a submit is already in flight.

All success cleanup should be defined per action in one place:

- clear draft when content was consumed
- clear attached notes only when chat context was consumed
- preserve or restore focus intentionally after modal flows and successful actions
- always return to `idle` even if a mutation throws

### Recording Model

Recording should behave like:

- `idle`
- `recording`
- `closed/transcribed`

The composer should own only the minimal local recording state needed to reflect UI feedback. When transcription finishes, the draft should update once and focus should return to the textarea predictably.

### Keyboard Rules

- `Enter` triggers the primary action
- `Shift+Enter` inserts a newline
- `Enter` does nothing when the current primary action is disabled

The keyboard path should call the same resolved primary action as the button.

### Affordances

Clarify the difference between:

- available tools
- active tools
- disabled or placeholder tools

If an action is not wired, it should not feel identical to an available feature. The UI should communicate that state clearly through semantics and styling.

Attached notes should read as active chat context, not decorative metadata.

## UI Direction

Keep the overall footprint and route-driven behavior, but make the web composer feel more deliberate:

- improve spacing rhythm between textarea, context chips, and controls
- strengthen hover, focus, and pressed states on buttons
- simplify the visual hierarchy so the writing area reads first
- make the footer controls feel more balanced and tactile
- preserve the current overall shape so the rewrite is low-risk visually

This pass should look more finished, not more experimental.

## Accessibility

The rewrite should improve:

- button labels and titles
- disabled semantics
- focus return after modal interactions
- keyboard submission consistency
- chip removal affordances
- textarea labeling and busy-state clarity

The shell should remain fully usable without pointer interactions.

## Testing Strategy

Add focused tests around the highest-risk behavior, especially the action resolver:

- capture posture primary action saves a note
- capture posture secondary action starts a chat
- draft posture primary action updates the note
- draft posture secondary action starts note discussion
- reply posture primary action sends message with note context
- reply posture secondary action saves the draft as a note
- enter key triggers only the enabled primary action
- submit state prevents double execution

Favor small unit or component tests over broad snapshots.

## Verification

Before implementation is considered complete:

- run the relevant composer and web tests
- run typechecking for affected packages
- run the repo safety checks required by project policy before any commit

## Risks

- The action resolver can become too abstract if it tries to hide every detail; keep it small and specific to the current three postures.
- Splitting the component too aggressively could create prop churn; keep view-model boundaries tight.
- Modal focus and async cleanup are easy places for regressions, so those should be checked directly.

## Implementation Outline

1. Add tests that lock current intended action behavior.
2. Extract the action resolution layer.
3. Split the main composer UI into smaller components around the new view model.
4. Tighten keyboard, loading, and focus behavior.
5. Apply restrained web-specific polish once the rewritten structure is stable.
