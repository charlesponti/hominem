## ADDED Requirements

### Requirement: Mobile SHALL present one shared workspace shell
The mobile app SHALL present authenticated note, chat, search, and settings work inside one protected workspace shell with a sticky top context switcher rather than separate peer product destinations.

#### Scenario: Authenticated user opens the mobile app
- **WHEN** an authenticated user opens the protected mobile experience
- **THEN** the app lands in the `Inbox` context by default
- **AND** the top navigation exposes `Inbox`, `Note`, `Chat`, `Search`, and `Settings`
- **AND** the active context is visually distinguished without leaving the shared workspace shell

### Requirement: Inbox SHALL be the canonical mobile home
The `Inbox` context SHALL render the user’s workspace as one chronological stream ordered by recency.

#### Scenario: User views the inbox stream
- **WHEN** the user is in the `Inbox` context
- **THEN** the screen shows notes, chat activity, assistant output, and attachments in one chronological stream
- **AND** the newest content appears first

#### Scenario: User creates new content
- **WHEN** the user creates a note or sends a chat message from the mobile workspace
- **THEN** the relevant stream item appears or updates in `Inbox` without requiring a manual refresh

### Requirement: Focused note and chat views SHALL remain part of the shared workspace
The mobile app SHALL provide focused `Note` and `Chat` contexts for authoring and conversation while preserving their relationship to the same shared stream.

#### Scenario: User opens a note from inbox
- **WHEN** the user taps a note item in `Inbox`
- **THEN** the app opens the `Note` context for that item
- **AND** returning to `Inbox` preserves the shared workspace model

#### Scenario: User opens a chat from inbox
- **WHEN** the user taps a chat item in `Inbox`
- **THEN** the app opens the `Chat` context for that conversation
- **AND** the chat remains a focused view of the same workspace rather than a separate product destination

### Requirement: Search SHALL operate across the same shared corpus
The `Search` context SHALL query the same underlying notes, chats, assistant output, and attachments represented in the mobile workspace.

#### Scenario: User searches the workspace
- **WHEN** the user switches to the `Search` context and enters a query
- **THEN** the app searches across the same shared workspace corpus
- **AND** results can resolve back into `Inbox`, `Note`, or `Chat` contexts without losing workspace continuity
