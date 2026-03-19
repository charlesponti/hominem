## ADDED Requirements

### Requirement: Mobile HyperForm SHALL be the only creation surface in the mobile workspace
The mobile app SHALL mount exactly one HyperForm in the protected workspace shell, and no route-local capture or chat input surface SHALL own draft state after this change ships.

#### Scenario: User switches between workspace contexts
- **WHEN** an authenticated user moves between `Inbox`, `Note`, `Chat`, and `Search`
- **THEN** the same HyperForm instance remains mounted
- **AND** no separate `CaptureBar`, `InputDock`, or route-local `ChatInput` instance owns the active draft

### Requirement: Mobile HyperForm SHALL adapt to workspace context
The mobile HyperForm SHALL change its posture, placeholder text, and actions based on the active workspace context.

#### Scenario: Inbox mode
- **WHEN** the active mobile context is `Inbox`
- **THEN** the HyperForm presents capture-first actions for note creation and assistant handoff
- **AND** the placeholder communicates that the user can write, speak, or attach content

#### Scenario: Note mode
- **WHEN** the active mobile context is `Note`
- **THEN** the HyperForm presents a drafting-first posture suitable for note writing
- **AND** it offers a secondary action to discuss the note with the assistant

#### Scenario: Chat mode
- **WHEN** the active mobile context is `Chat`
- **THEN** the HyperForm presents a compact reply-first posture
- **AND** sending content appends to the active chat transcript

#### Scenario: Search mode
- **WHEN** the active mobile context is `Search`
- **THEN** the HyperForm behaves as a query-first input with search affordances instead of note or chat submit actions

### Requirement: Mobile HyperForm draft SHALL survive context switches
The mobile HyperForm SHALL preserve draft text, staged attachments, and voice transcription results while the user moves between workspace contexts until the draft is submitted or explicitly cleared.

#### Scenario: User begins in inbox and switches to chat
- **WHEN** the user enters draft content in `Inbox` and then switches to `Chat`
- **THEN** the draft content remains in the HyperForm
- **AND** only the action labels and placeholder change to match chat mode

#### Scenario: Voice transcription completes before context switch
- **WHEN** the user records voice input and the transcription populates the HyperForm
- **THEN** the transcribed text remains available if the user switches to `Note` or `Chat` before submitting
