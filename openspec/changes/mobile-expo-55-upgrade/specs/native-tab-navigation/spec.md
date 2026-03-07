## ADDED Requirements

### Requirement: Native Tab Bar navigation structure

The mobile app SHALL implement a native Tab Bar using Expo Router's native tabs with four primary tabs: Chat, Notes, Focus, and Account.

#### Scenario: Tab structure is implemented
- **WHEN** app launches and user is authenticated
- **AND** native tab navigation is active
- **THEN** four tabs are visible at the bottom of the screen (iOS) or top (Android)
- **AND** each tab owns its feature domain (Chat, Notes, Focus, Account)

#### Scenario: Tab icons and labels use HIG standards
- **WHEN** tab bar is rendered
- **THEN** icons are SF Symbols on iOS and Material Icons on Android
- **AND** labels are concise (1-2 words max)
- **AND** active/inactive state is visually distinct

### Requirement: Tab-level provider and state management

The app SHALL manage providers at the tab level to avoid state loss and unnecessary re-renders during tab switching.

#### Scenario: Tab state persistence
- **WHEN** user switches between tabs
- **AND** tab data and UI state are managed locally per tab
- **THEN** returning to a tab preserves scroll position and UI state
- **AND** no screens are unnecessarily re-initialized on tab switch

### Requirement: Deep linking into tabs

All app routes SHALL be accessible via deep links that land into the correct tab and screen.

#### Scenario: Deep link resolution
- **WHEN** a deep link is opened (e.g., `hakumi://chat/thread/123`)
- **THEN** app navigates to the Chat tab
- **AND** the thread detail screen is displayed
- **AND** tab bar reflects the current tab location

### Requirement: Variant and authentication routing

Tab navigation SHALL only be shown when user is authenticated; unauthenticated users see auth flows outside tabs.

#### Scenario: Auth-gated tab navigation
- **WHEN** user is not authenticated
- **THEN** app displays auth/onboarding screens without tab bar
- **AND** tab navigation is not mounted

#### Scenario: Auth to tab transition
- **WHEN** user completes authentication
- **AND** app navigates to authenticated context
- **THEN** tab navigation becomes the primary shell
- **AND** user is placed into appropriate default tab (Chat or Notes)

### Requirement: Tab badge and notification support

The app SHALL support optional badge indicators (e.g., unread count) on tab icons.

#### Scenario: Tab badge display
- **WHEN** a tab has unread items or notifications
- **THEN** a badge indicator is visible on the tab icon
- **AND** badge count or indicator is dismissed when tab is viewed

### Requirement: Motion and animation for tab transitions

Tab switching animations SHALL be smooth and performant on native platforms.

#### Scenario: Tab transition performance
- **WHEN** user taps a different tab
- **AND** tab transition animation plays
- **THEN** animation completes within 300ms
- **AND** no janky frames or dropped animations on 60fps devices

### Requirement: Accessibility for tab navigation

Tab bar SHALL be fully accessible with proper labels, hit targets, and keyboard navigation.

#### Scenario: Accessibility compliance
- **WHEN** screen reader is enabled (iOS VoiceOver, Android TalkBack)
- **THEN** each tab is labeled and can be accessed via swipe navigation
- **AND** tab hit target meets 44pt minimum (iOS) or 48dp (Android)
