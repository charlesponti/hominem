## Why

The voice assistant plan is detailed product work that currently lives outside OpenSpec. It should be represented as an OpenSpec change so the feature can move through the same planning and implementation workflow as other work.

## What Changes

- Capture the voice assistant work as an OpenSpec change.
- Preserve the planned voice input mode, full-screen voice mode, and text-to-speech behavior.
- Keep the detailed implementation and testing direction inside the OpenSpec task structure.

## Capabilities

### New Capabilities

- `voice-assistant-chat`: Provides voice input and voice-mode interaction for the chat experience.

### Modified Capabilities

None.

## Impact

- Affected code: mobile chat surfaces, audio hooks, voice UI components, transcription flows, and voice-related tests.
- Affected systems: mobile assistant UX, audio handling, accessibility, and chat persistence.
