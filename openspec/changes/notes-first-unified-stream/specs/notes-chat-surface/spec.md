## MODIFIED Requirements

### Requirement: Notes home and Notes index SHALL share a single capture-and-browse system
The Notes app SHALL use the unified stream (`/stream`) as the single capture-and-browse surface for all items. The former `/home` and `/notes` index surfaces are replaced by the stream. There is one empty state, one list, one capture posture.

#### Scenario: User lands on an empty Notes account
- **WHEN** a user has no recent chats and no notes
- **THEN** the Notes app presents one intentional empty-state on the stream surface
- **AND** the app does not present separate competing empty-state paradigms for home, notes, or chats

#### Scenario: User views recent sessions and notes
- **WHEN** a user has both resumable chat sessions and saved notes
- **THEN** the stream renders both as typed cards in a single chronological list
- **AND** the user can filter to notes-only or chats-only via a filter pill without leaving the stream

## ADDED Requirements

### Requirement: The sidebar SHALL function as a unified stream navigator
The app sidebar SHALL render a single chronological list of mixed-type stream items (notes and chats), replacing the current split "recent chats" and notes sections.

#### Scenario: Sidebar shows mixed stream items
- **WHEN** a user has both notes and chat sessions
- **THEN** the sidebar displays them interleaved by `updated_at` in a single list
- **AND** each item has a type indicator (note icon or chat icon) for visual disambiguation

#### Scenario: Sidebar supports type filtering
- **WHEN** the user activates a type filter in the sidebar (e.g., "Notes only")
- **THEN** the sidebar list narrows to only items of that type
- **AND** the filter selection persists across navigation within the session

#### Scenario: Sidebar active item is highlighted
- **WHEN** the user is viewing a note or chat whose item is visible in the sidebar
- **THEN** that sidebar item is visually highlighted as the active item

### Requirement: The `/home` route SHALL redirect to `/stream`
The legacy `/home` route SHALL issue a client-side redirect to `/stream` to preserve backward compatibility with any existing bookmarks or deep links.

#### Scenario: User navigates to /home
- **WHEN** an authenticated user navigates to `/home`
- **THEN** the app immediately redirects to `/stream` without rendering the old home surface
