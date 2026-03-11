## Context

The existing voice assistant and AI-first Notes plans are now grounded by the `assistant-thought-lifecycle-foundation` change. This design covers feature implementation that assumes the thought lifecycle foundation already exists: home/dashboard, session, artifact, classification, lineage, and persistent text capture.

## Goals / Non-Goals

**Goals:**
- Preserve voice interaction, note workflows, AI actions, accessibility, and recovery behavior in one plan.
- Implement the thought-to-artifact product incrementally across both surfaces using the parity foundation.

**Non-Goals:**
- Redefining the canonical parity matrix, state model, or shared thought lifecycle contract already covered by the foundation change.
- Replacing the assistant backend itself.
- Requiring identical implementation details where a platform-specific adapter is sufficient.
- Introducing unplanned database changes without follow-up design.

## Decisions

### Treat voice as a session interaction mode

Voice input and full-screen voice conversations are part of the canonical session experience, not an independent product surface.

### Converge voice at the service and contract boundary

Voice support already shares low-level transcription services, but the platform transports are split. The assistant experience should converge on one canonical voice capability contract for recording lifecycle, transcription results, playback, interruption handling, and recovery behavior while preserving the parity rules defined in the foundation change.

### Implement features on top of the foundation contract

Implementation should assume the shared thought lifecycle contract exists and add feature behavior through platform adapters that preserve the twin-surface rules.

### Keep text capture present on every core surface

Because persistent text capture is foundational, feature work must preserve text input on home, session, and artifact-adjacent surfaces even as voice and AI behaviors are added.

## Feature Scope

The assistant feature change includes:

- home/dashboard feature implementation on top of `focus` and the future Notes home surface
- inline voice input
- full-screen voice mode
- transcription and playback behavior
- compact note capture
- dense artifact browsing and selection
- AI-assisted note actions
- review-before-apply persistence flows

These features must be delivered against the canonical thought lifecycle and parity rules defined by the foundation change.

## Implementation Constraints

- The feature change must not redefine the canonical information architecture.
- The feature change must use the shared thought lifecycle data and state semantics defined by the foundation change.
- The feature change must preserve persistent text capture across all core surfaces.
- Any feature-specific divergence between mobile and Notes requires an explicit exception.

## Risks / Trade-offs

- Implementing features before the foundation is locked can recreate drift -> Mitigation: treat the foundation as a prerequisite.
- Audio and accessibility work can regress quietly -> Mitigation: keep interruption, recovery, haptics, and accessibility explicit in the requirements and tasks.
- Split web and mobile voice transports can create behavioral divergence -> Mitigation: standardize voice capability semantics and test both adapters against the same contract.

## Migration Plan

1. Replace the split `voice-assistant` and `ai-first-notes-workspace` changes with `assistant-thought-lifecycle`.
2. Complete `assistant-thought-lifecycle-foundation` first.
3. Implement assistant features against that foundation one capability at a time.

## Open Questions

- Which feature should ship first after the foundation is complete: home/dashboard shell, inline voice, or compact note capture?
