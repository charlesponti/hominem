# Composer Missing Features Design

Date: 2026-03-20
Area: `apps/web/app/components/composer`

## Goal

Replace the remaining stubbed composer tool behavior with real attachment features for both note and chat flows, using one shared upload path and device capture on web for the camera action.

## Problems To Solve

- The composer shows attachment and camera controls that are currently stubbed or disabled.
- Chat and note flows both need attachment support, but the composer does not yet own a shared attachment model.
- The camera action on web should use device capture instead of implying an in-browser camera implementation.
- Submission behavior needs to account for upload state so users cannot send half-finished input.

## Non-Goals

- No in-browser camera modal.
- No new backend schema for note attachments in this pass.
- No unrelated redesign of the composer shell.

## Recommended Approach

Use one shared attachment pipeline for the composer across note and chat postures.

Files selected through the normal attachment button and files selected through a capture-enabled input should both upload immediately through the existing web upload API. The composer should then consume the resulting uploaded file state differently depending on posture.

## Architecture

### Shared Attachment State

Add composer-local attachment state that tracks:

- uploaded files
- in-flight uploads
- upload errors
- removal and reset behavior

This state should live with the composer container so tool buttons, attachment display, and submit actions all read from the same source of truth.

### Input Strategy

Use hidden file inputs in the composer layer:

- one standard multi-file picker for attachments
- one capture-enabled input for device camera where supported

The camera action should use device capabilities when available and otherwise degrade to the file picker behavior the browser supports.

### Action Integration

Extend the composer action resolver so uploads become part of the current submit behavior:

- chat capture and reply consume uploaded files as assistant context
- note capture and draft consume uploaded files as note attachment references

The resolver should also block submission while uploads are active.

## Behavior Design

### Upload Flow

- selecting files starts upload immediately
- uploaded items appear in the composer before submit
- users can remove uploaded items before submit
- upload errors remain visible until removed or replaced
- submit is disabled while uploads are in progress

### Chat Behavior

For chat creation and reply:

- uploaded files should be serialized into a structured attachment context block
- that block should compose cleanly with any attached-note context already being injected
- uploaded files clear only after successful chat submission

### Note Behavior

For note creation and note update:

- uploaded files should be preserved in the note output, not dropped
- because this pass avoids backend schema changes, the safest implementation is a structured attachment section appended to note content using uploaded file metadata
- the format should be explicit and parseable so it can be replaced later if dedicated note attachments are added
- uploaded files clear only after successful note submission

### UI

Show uploaded files in a separate attachment list distinct from attached-note context chips.

Each uploaded item should show:

- filename
- upload state or error
- remove affordance

The attachment list should sit near the draft area so users understand it as part of the message or note they are composing.

## Accessibility

The feature pass should improve:

- file-picker button semantics
- camera button semantics
- upload error visibility
- removable attachment affordances
- disabled state clarity while uploads are active

## Testing Strategy

Add focused tests for:

- file selection starts upload and renders uploaded files
- upload-in-progress disables submit
- reply send includes uploaded file context
- note save persists uploaded file references
- uploaded files clear only after successful submission
- camera action triggers the capture input path

Retain browser-level coverage for note save, chat creation, reply send, and visible attachment controls.

## Verification

Before completion:

- run the focused composer unit tests
- run relevant web end-to-end tests covering note and chat attachment flows
- run typecheck for web
- run the repo safety checks

## Risks

- attachment state can drift from submit state if upload lifecycle is not centralized
- note attachment formatting can become messy if it is not structured from the start
- combining file attachments with note-context attachments may confuse users if the UI does not separate them clearly

## Implementation Outline

1. Add failing tests for upload state and submit gating.
2. Introduce shared composer attachment state and file inputs.
3. Wire regular attachment and camera buttons to real selection flows.
4. Extend submit behavior for both chat and note postures.
5. Add attachment UI, error handling, and cleanup behavior.
