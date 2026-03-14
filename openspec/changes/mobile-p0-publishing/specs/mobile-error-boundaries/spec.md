## MODIFIED Requirements

### Requirement: Error logging forwards to observability backend
The `logError` function SHALL forward captured errors to PostHog in production in addition to writing to the in-memory log.

#### Scenario: Error captured in production
- **WHEN** `logError` is called with an error in a non-dev environment
- **THEN** the error is added to the in-memory log AND sent to PostHog as a `$exception` event with feature, route, and userId context

#### Scenario: Error captured in development
- **WHEN** `logError` is called with `__DEV__` true
- **THEN** the error is added to the in-memory log and logged to console but NOT sent to PostHog
