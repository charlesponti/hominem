## ADDED Requirements

### Requirement: A chat SHALL be able to reference one or more notes as context
The system SHALL allow a chat session to carry references to one or more notes. These references represent context the user has chosen to provide to the chat; they do not imply ownership — notes remain independent entities.

#### Scenario: Chat is created with note references
- **WHEN** a user starts a new chat from HyperForm with one or more notes attached
- **THEN** the chat is persisted with those note references
- **AND** the referenced notes are included as context in the first AI turn

#### Scenario: Note references are visible in the chat header
- **WHEN** a user opens a chat that has note references
- **THEN** the chat surface displays a context strip listing the referenced note titles
- **AND** each referenced note title is a link to `/notes/$noteId`

#### Scenario: Note references do not appear on the note itself
- **WHEN** a user views a note that has been referenced by one or more chats
- **THEN** the note surface does not display which chats reference it
- **AND** the note's content and metadata are unaffected by the reference relationship

### Requirement: The note-picker SHALL allow users to attach notes as context in chat mode
HyperForm in `chat-continuation` or `default` (starting a chat) mode SHALL provide a note-picker affordance that lets users search and select notes to attach as context.

#### Scenario: User attaches a note before sending the first message
- **WHEN** a user opens HyperForm intending to start a chat or continue one
- **THEN** an "Add note context" affordance is available in the form footer
- **AND** activating it opens a note-picker with recent notes pre-populated

#### Scenario: Note-picker supports search
- **WHEN** the note-picker is open
- **THEN** the user can type to filter notes by title or body excerpt
- **AND** results update as the user types

#### Scenario: Selected notes appear as chips in HyperForm
- **WHEN** the user selects one or more notes in the picker
- **THEN** each selected note appears as a removable chip in the HyperForm context strip
- **AND** the user can remove a note reference by dismissing its chip before sending

### Requirement: The stream API SHALL return a unified feed of notes and chats
The `/stream` API endpoint SHALL return a discriminated union of note and chat items, sorted by `updated_at` descending, with cursor-based pagination.

#### Scenario: Stream endpoint returns mixed results
- **WHEN** a client requests the stream with no type filter
- **THEN** the response contains both note items (`type: 'note'`) and chat items (`type: 'chat'`) interleaved by `updated_at`

#### Scenario: Stream endpoint supports type filtering
- **WHEN** a client requests the stream with `?type=note` or `?type=chat`
- **THEN** the response contains only items of the requested type
- **AND** cursor-based pagination still applies
