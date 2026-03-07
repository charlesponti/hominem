## ADDED Requirements

### Requirement: Single source of truth for feature state
The system SHALL maintain exactly one active source of state per feature, eliminating competing state sources.

#### Scenario: Chat messages state
- **WHEN** the chat feature is active
- **THEN** chat messages SHALL be stored only in React Query cache
- **AND** AI SDK SHALL update React Query, not maintain separate state
- **AND** SQLite SHALL persist from React Query, not serve as source

#### Scenario: Focus items state
- **WHEN** the focus list is displayed
- **THEN** focus items SHALL come from React Query cache
- **AND** local modifications SHALL use React Query mutations
- **AND** optimistic updates SHALL be managed by React Query

#### Scenario: State synchronization
- **WHEN** server state changes
- **THEN** React Query SHALL update its cache
- **AND** UI SHALL re-render from React Query
- **AND** SQLite SHALL persist the new state asynchronously

### Requirement: Consistent optimistic update pattern
The system SHALL use React Query's optimistic update capabilities for all user actions.

#### Scenario: Optimistic complete focus item
- **WHEN** user marks a focus item complete
- **THEN** UI SHALL immediately reflect completion
- **AND** React Query SHALL optimistically update cache
- **AND** mutation SHALL send request to server
- **AND** on success, cache SHALL be confirmed
- **AND** on error, cache SHALL rollback automatically

#### Scenario: Optimistic send chat message
- **WHEN** user sends a chat message
- **THEN** message SHALL appear immediately in UI
- **AND** React Query SHALL optimistically add to cache
- **AND** streaming response SHALL update same cache entry
- **AND** no duplicate or conflicting state SHALL exist

### Requirement: Proper query key structure
The system SHALL use consistent and predictable query keys for all cached data.

#### Scenario: Chat messages query key
- **WHEN** caching chat messages
- **THEN** query key SHALL include ['chatMessages', chatId]
- **AND** SHALL include any relevant filters
- **AND** SHALL be used consistently across all operations

#### Scenario: Focus items query key
- **WHEN** caching focus items
- **THEN** query key SHALL include ['focusItems']
- **AND** SHALL include filter parameters when applicable
- **AND** mutations SHALL invalidate correct keys

### Requirement: Mutation invalidation strategy
The system SHALL properly invalidate queries after mutations to keep data consistent.

#### Scenario: After sending chat message
- **WHEN** a chat message is successfully sent
- **THEN** React Query SHALL invalidate ['chatMessages', chatId]
- **AND** UI SHALL refetch to get server state
- **AND** optimistic state SHALL merge with server state

#### Scenario: After completing focus item
- **WHEN** a focus item is completed
- **THEN** React Query SHALL invalidate ['focusItems']
- **AND** list SHALL refetch
- **AND** completed item SHALL appear in correct state

### Requirement: Offline support through React Query
The system SHALL use React Query's built-in offline support instead of custom queuing.

#### Scenario: Network unavailable during mutation
- **WHEN** user performs an action while offline
- **THEN** React Query SHALL queue the mutation
- **AND** optimistic update SHALL still show in UI
- **AND** when online, queued mutations SHALL execute
- **AND** custom AsyncStorage queue SHALL NOT be used

#### Scenario: Offline chat start
- **WHEN** user starts a chat while offline
- **THEN** React Query SHALL handle retry logic
- **AND** UI SHALL show pending state
- **AND** no custom start queue SHALL be needed

### Requirement: Memory-efficient caching
The system SHALL configure React Query cache appropriately for mobile constraints.

#### Scenario: Cache garbage collection
- **WHEN** data is unused for gcTime duration
- **THEN** React Query SHALL remove it from memory
- **AND** SQLite persistence SHALL remain
- **AND** refetching SHALL restore data from server or SQLite

#### Scenario: Stale data handling
- **WHEN** data becomes stale
- **THEN** React Query SHALL mark it stale
- **AND** background refetch SHALL update it
- **AND** UI SHALL show stale data rather than loading state
