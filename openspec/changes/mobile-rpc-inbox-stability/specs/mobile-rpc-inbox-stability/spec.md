## ADDED Requirements

### Requirement: Mobile inbox startup SHALL avoid repeated RPC failure spam
The mobile app SHALL not emit repeated runtime RPC errors during inbox startup when one startup query fails.

#### Scenario: Inbox startup query fails
- **WHEN** a startup RPC query used by the mobile inbox fails
- **THEN** the mobile app handles the failure in a controlled way
- **AND** it does not repeatedly spam identical runtime RPC errors for the same startup state

### Requirement: Mobile inbox SHALL tolerate transient network failures
The mobile inbox SHALL degrade gracefully when the API is temporarily unreachable during startup.

#### Scenario: Temporary network failure during inbox load
- **WHEN** the mobile app cannot reach the API during inbox startup
- **THEN** the app surfaces a controlled loading or error posture
- **AND** it does not crash or enter an uncontrolled repeated failure loop

### Requirement: Mobile inbox startup RPC routes SHALL not return unexpected 500 errors in the healthy local development path
The API routes used by the mobile inbox startup flow SHALL complete successfully in the normal authenticated local development path.

#### Scenario: Healthy local mobile dev startup
- **WHEN** the authenticated mobile app loads the inbox against a healthy local API server
- **THEN** the notes and chat startup RPC routes return successful responses
- **AND** the inbox can render without `internal_error`
