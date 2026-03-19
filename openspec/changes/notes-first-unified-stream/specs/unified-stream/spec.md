## ADDED Requirements

### Requirement: The app SHALL provide a unified stream as the home surface
The Notes app SHALL render a `/stream` route as the canonical home surface, presenting a single chronological feed of `Note` and `Chat` items sorted by `updated_at` descending.

#### Scenario: User lands on the app
- **WHEN** an authenticated user navigates to the root URL or `/stream`
- **THEN** the app renders the unified stream feed
- **AND** both notes and chat sessions are visible as distinct typed cards in a single list

#### Scenario: Root and legacy home redirect to stream
- **WHEN** an authenticated user navigates to `/` or `/home`
- **THEN** the app redirects to `/stream` without showing an intermediate page

### Requirement: Stream items SHALL be rendered as typed cards with shared anatomy
Each item in the stream SHALL render as a card with a shared structural anatomy (title, metadata row, preview excerpt, type indicator) while allowing type-specific visual treatment.

#### Scenario: Note item renders in stream
- **WHEN** a note appears in the stream feed
- **THEN** it renders with its title, a preview of the body text, last-updated timestamp, and a note-type indicator
- **AND** clicking the card navigates to `/notes/$noteId`

#### Scenario: Chat item renders in stream
- **WHEN** a chat session appears in the stream feed
- **THEN** it renders with its title (or last message excerpt), last-activity timestamp, message count, and a chat-type indicator
- **AND** clicking the card navigates to `/chat/$chatId`

### Requirement: The stream SHALL support cursor-based pagination
The stream feed SHALL load items in pages via cursor-based pagination, with a "Load more" affordance at the bottom of the list.

#### Scenario: User reaches the end of the initial page
- **WHEN** the user scrolls to the bottom of the stream and more items exist
- **THEN** a "Load more" button or trigger is visible
- **AND** activating it appends the next page of items without replacing the current list

#### Scenario: Stream is exhausted
- **WHEN** no more items exist beyond the current page
- **THEN** the "Load more" affordance is not shown
- **AND** an end-of-stream indicator is displayed

### Requirement: The stream SHALL display an intentional empty state for new users
When a user has no notes or chats, the stream SHALL render a single empty state that invites the user to create their first item via HyperForm.

#### Scenario: New user with no items views the stream
- **WHEN** an authenticated user with zero notes and zero chats navigates to `/stream`
- **THEN** the stream renders a single empty state (not separate empty states for notes and chats)
- **AND** the empty state includes a prompt directing the user to the HyperForm
