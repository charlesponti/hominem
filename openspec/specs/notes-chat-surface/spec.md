## ADDED Requirements

### Requirement: The Notes app SHALL render as one coherent product family
The Notes app SHALL present home capture, recent sessions, notes lists, note workspaces, and chat as one coherent product family with shared visual hierarchy, metadata posture, and action hierarchy rather than as separate utility pages.

#### Scenario: User moves between primary Notes surfaces
- **WHEN** an authenticated user moves from home to the notes list, to a note workspace, and into chat
- **THEN** each surface preserves a recognizably shared hierarchy for spacing, headers, metadata, and primary actions
- **AND** the experience does not feel like unrelated tools stitched together inside the same shell

### Requirement: Notes home and Notes index SHALL share a single capture-and-browse system
The Notes home surface and Notes index surface SHALL use the same capture model, list semantics, and empty-state language rather than duplicating slightly different bordered utility layouts.

#### Scenario: User lands on an empty Notes account
- **WHEN** a user has no recent chats and no notes
- **THEN** the Notes app presents one intentional empty-state and capture posture
- **AND** the app does not present separate competing empty-state paradigms for home and notes

#### Scenario: User views recent sessions and notes
- **WHEN** a user has both resumable chat sessions and saved notes
- **THEN** the app distinguishes them through hierarchy and labeling inside a coherent browse surface
- **AND** both surfaces still feel part of the same product system

### Requirement: The note workspace SHALL prioritize authoring over utility chrome
The note detail and edit experience SHALL present note content as the dominant primary surface, with metadata and secondary actions subordinate to the writing workflow.

#### Scenario: User opens a note workspace
- **WHEN** a user opens a note for reading or editing
- **THEN** the writing surface is visually primary
- **AND** metadata, destructive actions, and AI affordances do not compete equally with the note body

#### Scenario: User uses AI from a note workspace
- **WHEN** a user triggers an AI action from a note workspace
- **THEN** the handoff into chat or AI assistance feels like an intentional extension of the note workspace
- **AND** the UI does not rely on a detached development-style action toolbar as the primary AI affordance

### Requirement: Notes chat SHALL render as a dedicated conversation surface
The Notes `chat/:chatId` route SHALL render as a responsive single-column conversation surface with route-local layout behavior rather than inheriting the default document-page geometry of the shared app shell.

#### Scenario: Mobile chat session renders
- **WHEN** an authenticated user opens a Notes chat session on a mobile viewport
- **THEN** the page renders a dedicated chat surface with a compact local header, a scrollable conversation thread, and a composer that remains accessible above the mobile tab bar

#### Scenario: Desktop chat session renders
- **WHEN** an authenticated user opens a Notes chat session on a larger viewport
- **THEN** the conversation thread remains single-column and centered with a readable maximum width instead of stretching across the full app-shell content width

### Requirement: Notes SHALL use a shared cross-platform presentation contract
The Notes redesign SHALL define a shared presentation contract across the web Notes app and the mobile app, with canonical Notes semantics and tokenized layout rules owned by the shared UI layer.

#### Scenario: Shared chat primitives define role semantics
- **WHEN** a platform chat implementation renders a message using the shared chat presentation contract
- **THEN** assistant turns use transcript-row semantics
- **AND** user turns use compact-bubble semantics
- **AND** system turns use low-emphasis utility semantics

#### Scenario: Platform implementations preserve the same chat hierarchy
- **WHEN** a user compares the Notes web chat surface and the mobile chat surface for the same conversation state
- **THEN** both platforms preserve the same transcript spacing, composer hierarchy, metadata hierarchy, and search/debug posture even if the host UI components differ

#### Scenario: Platform implementations preserve the same Notes hierarchy beyond chat
- **WHEN** a user compares primary Notes surfaces across web and mobile
- **THEN** the apps preserve the same high-level hierarchy for capture, browse, workspace, and conversation surfaces even if the host widgets differ

### Requirement: Notes chat SHALL consolidate secondary actions into a local header dropdown
The Notes chat surface SHALL expose route-local secondary actions through a single overflow dropdown in the chat header instead of a persistent action row inside the page body.

#### Scenario: User opens chat actions
- **WHEN** a user opens the chat header dropdown in a session with existing messages
- **THEN** the menu exposes available transform actions for the conversation
- **AND** the page does not render a separate always-visible artifact action strip below the thread

#### Scenario: User opens chat actions without conversation content
- **WHEN** a user opens the chat header dropdown before the session contains any transformable message history
- **THEN** transform actions are unavailable or disabled in that menu state

### Requirement: Notes chat search SHALL preserve the current thread state
The Notes chat surface SHALL provide message search as an overlay interaction that can be dismissed without resetting the user’s thread position or replacing the conversation view.

#### Scenario: User opens and closes search
- **WHEN** a user opens message search from the chat surface and then dismisses it
- **THEN** the conversation thread remains visible beneath the overlay
- **AND** the user returns to the same chat surface state after dismissal

#### Scenario: User searches within a long thread
- **WHEN** a user searches within a chat session that uses the message thread’s standard rendering behavior
- **THEN** the search interaction does not introduce a second route or full-page mode change

### Requirement: Notes chat SHALL provide opt-in inline debug metadata
The Notes chat surface SHALL provide a `Show debug` action that reveals additional per-message diagnostics inline without changing the default reader-friendly message presentation.

#### Scenario: Debug mode enabled
- **WHEN** a user enables `Show debug` from the chat header dropdown
- **THEN** each rendered message reveals any available low-level metadata such as message id, exact timestamp, raw role, streaming state, and tool-call diagnostics

#### Scenario: Debug mode disabled
- **WHEN** debug mode is not enabled
- **THEN** the chat surface shows only the normal message annotations needed for regular reading and conversation use

### Requirement: Shared chat presentation SHALL distinguish assistant transcript rows from user bubbles
The shared chat presentation model SHALL not force identical bubble treatment for all message roles.

#### Scenario: Assistant message renders
- **WHEN** an assistant message is rendered in Notes chat on web or mobile
- **THEN** it appears as transcript content without default bubble chrome
- **AND** any reasoning, tool, or debug details remain subordinate to the main message content

#### Scenario: User message renders
- **WHEN** a user message is rendered in Notes chat on web or mobile
- **THEN** it appears as a compact aligned bubble with a single surface
- **AND** the UI does not render an additional decorative outer container around that message

### Requirement: Chat composer SHALL remain a single-surface interaction across platforms
The Notes chat composer SHALL present the same high-level interaction structure on web and mobile: optional lightweight suggestions, a primary input region, and a secondary footer region for tools and status.

#### Scenario: Empty composer state renders
- **WHEN** the composer is empty and suggestions are available
- **THEN** the UI shows lightweight suggestion chips above the composer
- **AND** the composer still renders as one unified surface rather than stacked panels

#### Scenario: Platform-specific composer controls differ
- **WHEN** web and mobile render the chat composer with platform-appropriate controls
- **THEN** they may differ in host widgets or touch-target sizing
- **AND** they preserve the same visual hierarchy and single-surface composer structure

### Requirement: Notes chat review flow SHALL remain overlay-based
The Notes chat surface SHALL present the note-classification review step as an overlay interaction that preserves the conversation surface beneath it.

#### Scenario: Mobile classification review
- **WHEN** a user triggers note classification from the chat actions on a mobile viewport
- **THEN** the review UI appears as a bottom-sheet style overlay above the conversation surface

#### Scenario: Desktop classification review
- **WHEN** a user triggers note classification from the chat actions on a larger viewport
- **THEN** the review UI appears as a centered modal-style overlay instead of a persistent side panel
