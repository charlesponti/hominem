## ADDED Requirements

### Requirement: The product SHALL provide one assistant thought lifecycle across surfaces
The mobile app and Notes app SHALL expose assistant features through the canonical twin-surface thought contract defined by the parity foundation change.

#### Scenario: User opens a canonical assistant surface
- **WHEN** a signed-in user opens the logged-in home/dashboard or canonical session surface in the mobile app or the Notes app
- **THEN** the user sees the assistant thought lifecycle expressed through the same home, session, and artifact structure

#### Scenario: A surface loads assistant features
- **WHEN** the mobile app or Notes app loads an assistant feature
- **THEN** the feature runs within the canonical thought lifecycle structure and shared semantics defined by the parity foundation change

### Requirement: The assistant experience SHALL preserve persistent text capture
The assistant experience SHALL preserve text capture across the home/dashboard, canonical session surfaces, and artifact-adjacent surfaces.

#### Scenario: User moves across core surfaces
- **WHEN** a user navigates between home, session, and artifact-adjacent surfaces
- **THEN** the user retains an available text input path to capture a new thought or continue an existing one

### Requirement: The assistant experience SHALL support voice interactions
The assistant experience SHALL support inline voice input and a full-screen voice mode without losing session or conversation context.

#### Scenario: User switches into voice interaction
- **WHEN** a user starts inline voice input or opens full-screen voice mode
- **THEN** audio capture, transcription, playback, and return-to-session behavior preserve the same conversation context and recovery rules

#### Scenario: Voice interaction is interrupted
- **WHEN** recording, transcription, or playback is interrupted by an app or device event
- **THEN** both surfaces apply the same recovery outcome defined by the shared voice contract

### Requirement: The assistant experience SHALL support AI-assisted artifact workflows
The assistant experience SHALL support compact note capture, dense artifact browsing, and AI-assisted note actions that users can review before applying.

#### Scenario: User applies an AI note action
- **WHEN** a user runs an AI action on a note from the assistant experience
- **THEN** the proposed result is shown for review before any persisted update is applied

#### Scenario: User rejects an AI note action
- **WHEN** a user dismisses or rejects a proposed AI-generated note change
- **THEN** no persisted update is applied and the underlying note remains unchanged

### Requirement: The assistant experience SHALL include accessibility and recovery behavior
The assistant experience SHALL handle interruptions, accessibility needs, and recoverable failures consistently across both surfaces.

#### Scenario: Assistant interaction is interrupted
- **WHEN** a voice or note workflow is interrupted by an app, network, or device event
- **THEN** the assistant experience recovers or exits according to the same documented accessibility and recovery behavior on both surfaces

### Requirement: The assistant experience SHALL be verified through parity-focused tests
The assistant experience SHALL include tests that validate parity-critical behavior before implementation is considered complete.

#### Scenario: A parity-critical workflow changes
- **WHEN** a parity-critical workflow for home, session, voice interaction, or AI note review changes
- **THEN** contract or end-to-end tests verify the same expected outcome for both surfaces
