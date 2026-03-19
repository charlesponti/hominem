## MODIFIED Requirements

### Requirement: The HyperForm SHALL adapt its mode to the current route
The correct mode SHALL be active without any user action. On the stream route (`/stream`), the HyperForm SHALL enter `default` mode, which presents two explicit send affordances: "Save as note" and "Start chat".

#### Scenario: User navigates from stream to a note
- **GIVEN** the HyperForm is in `default` mode on `/stream`
- **WHEN** the user navigates to `/notes/abc123`
- **THEN** the HyperForm switches to `note-aware` mode
- **AND** Region 1 shows the note's title
- **AND** the primary button reads "Ask about this note →"
- **AND** if draft text is present, the label transition is animated via GSAP `contextSwitch`

#### Scenario: User navigates to a chat route
- **GIVEN** the HyperForm is in `default` mode
- **WHEN** the user navigates to `/chat/xyz`
- **THEN** the HyperForm switches to `chat-continuation` mode
- **AND** submitting sends a message to that chat session

#### Scenario: User navigates to /stream
- **GIVEN** the HyperForm is in any mode
- **WHEN** the user navigates to `/stream`
- **THEN** the HyperForm enters `default` mode
- **AND** the action footer shows two buttons: "Save as note" and "Start chat"

## ADDED Requirements

### Requirement: HyperForm default mode SHALL use committed-on-send to distinguish note creation from chat initiation
In `default` mode, the HyperForm SHALL present a single text input with two explicit action buttons in the footer. The user types first and chooses the action at submit time. There is no pre-input mode toggle.

#### Scenario: User saves input as a note
- **WHEN** a user types text in HyperForm on `/stream` and activates "Save as note"
- **THEN** a new note is created with the input as its content
- **AND** the stream updates to show the new note at the top
- **AND** HyperForm clears and returns to the collapsed resting state

#### Scenario: User starts a chat from HyperForm
- **WHEN** a user types text in HyperForm on `/stream` and activates "Start chat"
- **THEN** a new chat session is created with the input as the first user message
- **AND** the app navigates to `/chat/$newChatId`
- **AND** the AI response begins loading immediately

#### Scenario: Enter key in default mode prompts for action
- **WHEN** a user presses Enter/Return while the HyperForm is in `default` mode
- **THEN** a small action menu appears with "Save as note" and "Start chat" options
- **AND** the input text is not submitted until the user selects an action

### Requirement: HyperForm chat mode SHALL provide a note-context affordance
When the HyperForm is in `chat-continuation` mode or when starting a new chat from `default` mode, the form footer SHALL include an affordance to attach notes as context.

#### Scenario: User attaches a note in chat mode
- **WHEN** the HyperForm is in `chat-continuation` mode and the user activates "Add note context"
- **THEN** a note-picker opens showing recent notes
- **AND** selecting a note adds it as a chip in the HyperForm context strip (Region 1)

#### Scenario: User removes an attached note before sending
- **WHEN** one or more note chips are visible in Region 1
- **THEN** the user can dismiss any chip to remove that note reference before sending
