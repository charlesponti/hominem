## ADDED Requirements

### Requirement: Route protection via guarded groups

The app SHALL protect authenticated routes using guarded groups to redirect unauthorized access to auth flows.

#### Scenario: Route protection for auth
- **WHEN** user is not authenticated
- **AND** attempts to access a protected route
- **THEN** user is redirected to auth/onboarding flow
- **AND** protected routes are not rendered

#### Scenario: Auth flow completion
- **WHEN** user completes authentication
- **AND** returns to protected route
- **THEN** access is granted and content is rendered
- **AND** redirect loop is prevented

### Requirement: Deep linking with native intent rewriting

The app SHALL rewrite incoming deep links via `+native-intent` file and trigger app-specific actions.

#### Scenario: Deep link into feature
- **WHEN** deep link is opened (e.g., `hakumi://notes/abc123`)
- **AND** `+native-intent` processes the link
- **THEN** app navigates to Notes tab
- **AND** specific note is displayed
- **AND** authentication is checked before rendering

#### Scenario: Deferred deep links
- **WHEN** app receives deep link before auth
- **THEN** auth is completed first
- **AND** deep link is resolved after authentication
- **AND** user lands at correct destination

### Requirement: Server Components (RSC) for secure operations

The app MAY use React Server Components for secure data fetching and API integration where applicable.

#### Scenario: Server-side data fetching
- **WHEN** a Server Component route is rendered
- **AND** API calls are made server-side
- **THEN** secrets and API keys are not exposed to client
- **AND** sensitive data is safely filtered before sending to client

### Requirement: Route groups for feature reuse

The app SHALL use route groups and array syntax to reuse screens across multiple tabs or domains.

#### Scenario: Shared screen across routes
- **WHEN** a screen exists in multiple feature contexts (e.g., account profile in Account tab and in Chat settings)
- **AND** route arrays are used to define multiple paths to the same screen
- **THEN** single component implementation serves all routes
- **AND** route-specific props are passed correctly

### Requirement: Native bottom sheets

The app SHALL use native presentation form sheet for modal workflows and bottom sheets.

#### Scenario: Bottom sheet presentation
- **WHEN** bottom sheet is triggered
- **AND** native presentation form sheet is used
- **THEN** sheet appears with native iOS/Android animation
- **AND** swipe-to-dismiss gesture is responsive
- **AND** keyboard handling is correct (iOS)

### Requirement: Deep link preview (iOS)

The app MAY implement link preview on iOS with long-press and customizable context menu.

#### Scenario: Link preview on long-press
- **WHEN** user long-presses a link
- **AND** link preview UI appears
- **THEN** preview shows relevant content
- **AND** context menu offers customizable actions

### Requirement: Unstable native tabs polishing

The app SHALL use `unstable_native_tabs` or custom headless tab layout for optimal native feel.

#### Scenario: Native tab bar rendering
- **WHEN** app renders tab navigation
- **AND** unstable_native_tabs is used
- **THEN** tab bar uses native UITabBarController (iOS) / BottomTabNavigator (Android)
- **AND** tab transitions are smooth and native-feeling

### Requirement: Static rendering for web content

The app MAY use static site generation (SSG) for marketing pages and web-only content.

#### Scenario: Static page rendering
- **WHEN** a static route is requested
- **AND** SSG is configured
- **THEN** page is pre-rendered and served as static HTML
- **AND** SEO metadata is included
- **AND** dynamic routes can coexist with static content
