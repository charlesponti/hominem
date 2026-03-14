## ADDED Requirements

### Requirement: PostHog client singleton
The app SHALL initialise a single PostHog client instance at startup using the `EXPO_PUBLIC_POSTHOG_API_KEY` environment variable.

#### Scenario: Client initialises on app launch
- **WHEN** the app launches with `EXPO_PUBLIC_POSTHOG_API_KEY` set
- **THEN** a PostHog client is available for use throughout the app

#### Scenario: Missing API key in development
- **WHEN** `EXPO_PUBLIC_POSTHOG_API_KEY` is not set
- **THEN** PostHog initialises in a no-op mode and logs a warning in `__DEV__`

### Requirement: PostHog provider wraps app tree
The app SHALL mount a `PostHogProvider` at the root layout so all screens have access to PostHog context.

#### Scenario: Provider available to all screens
- **WHEN** any screen renders
- **THEN** `usePostHog()` hook returns the initialised client

### Requirement: Exception capture on error boundary trigger
The app SHALL capture exceptions to PostHog whenever `logError` is called.

#### Scenario: Error boundary catches an error
- **WHEN** a React error boundary catches an unhandled error
- **THEN** PostHog receives a `$exception` event with the error message, stack, feature, route, and userId context

#### Scenario: Production-only capture
- **WHEN** `__DEV__` is true
- **THEN** the exception is logged to console but NOT sent to PostHog

### Requirement: User identity forwarded with events
The app SHALL identify the PostHog user when the authenticated user session is established.

#### Scenario: User signs in
- **WHEN** the auth session is established and a userId is available
- **THEN** `posthog.identify(userId)` is called so subsequent events are attributed to that user

#### Scenario: User signs out
- **WHEN** the user signs out
- **THEN** `posthog.reset()` is called to disassociate the session
