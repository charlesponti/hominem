## Context

The legacy plan already defines the interaction model, state machines, architecture, and component hooks for a voice assistant feature. The migration goal is to move that planned work into OpenSpec without losing the structure.

## Goals / Non-Goals

**Goals:**
- Preserve the voice assistant plan in OpenSpec.
- Represent both inline voice input and full-screen voice mode.
- Keep accessibility, haptics, and error handling as first-class parts of the feature.

**Non-Goals:**
- Real-time subtitles beyond the scoped future enhancement.
- Replacing the underlying chat model stack.

## Decisions

### Represent voice work as one chat capability

The old plan describes one cohesive feature with multiple modes, so it maps cleanly to one capability.

### Preserve mode-based implementation sequencing

The original plan already splits the work into voice input, voice mode, TTS, task confirmation, and testing. The migrated tasks follow that structure.

## Risks / Trade-offs

- Audio behavior is sensitive to interruptions and device conditions -> Mitigation: keep interruption handling and testing explicit.
- Accessibility and haptics can be skipped late if not captured directly -> Mitigation: include them in the capability and tasks.

## Migration Plan

1. Capture the voice assistant plan in OpenSpec.
2. Remove the old docs/plans file.
3. Continue implementation from the OpenSpec tasks.

## Open Questions

- None during migration.
