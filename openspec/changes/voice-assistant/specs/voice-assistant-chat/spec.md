## ADDED Requirements

### Requirement: Chat SHALL support inline voice input
The chat experience SHALL support an inline voice input mode that captures speech and turns it into chat input.

#### Scenario: User records inline voice input
- **WHEN** a user enters voice input mode and records speech
- **THEN** the recording flow captures audio, provides visible feedback, and routes the result into the chat workflow

### Requirement: Chat SHALL support a full-screen voice mode
The chat experience SHALL support a full-screen voice mode for conversational voice interaction.

#### Scenario: User enters voice mode
- **WHEN** a user opens the full-screen voice mode
- **THEN** the user can speak with the assistant and return to the normal chat flow without losing conversation context

### Requirement: Voice assistant flows SHALL include accessibility and recovery behavior
The voice assistant SHALL handle interruptions, accessibility needs, and recoverable failures explicitly.

#### Scenario: Voice flow is interrupted
- **WHEN** recording or voice mode is interrupted by an app or device event
- **THEN** the feature exits or recovers according to the defined interruption and accessibility behavior
