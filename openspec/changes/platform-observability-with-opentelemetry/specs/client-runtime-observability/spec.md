## ADDED Requirements

### Requirement: Browser apps emit client telemetry
The system MUST instrument maintained browser apps so key user-facing flows generate client telemetry that can be correlated with backend requests.

#### Scenario: Route transition is captured in browser telemetry
- **WHEN** a user navigates within an instrumented browser app
- **THEN** the app MUST emit telemetry for the route transition or screen load
- **AND** the emitted data MUST identify the app and route shape without leaking sensitive content

#### Scenario: Client request propagates backend trace context
- **WHEN** a browser app issues an API request to an instrumented backend
- **THEN** the request MUST include the configured trace propagation headers
- **AND** backend telemetry MUST be able to correlate the request with the originating client flow

### Requirement: Mobile app emits correlated runtime telemetry
The system MUST instrument the mobile app so app lifecycle and network activity can be correlated with backend service telemetry where platform support allows.

#### Scenario: Mobile network request participates in distributed trace
- **WHEN** the mobile app sends a request to an instrumented backend service
- **THEN** the request MUST propagate trace context using the shared repo standard
- **AND** the backend trace MUST be linkable to the mobile operation that initiated it

#### Scenario: Mobile lifecycle telemetry is captured
- **WHEN** the mobile app launches, resumes, backgrounds, or navigates between primary screens
- **THEN** the app MUST emit telemetry for those lifecycle transitions
- **AND** the emitted telemetry MUST identify the app runtime and current environment

### Requirement: Client-side failures flow into the shared observability model
The system MUST capture handled and unhandled client runtime failures through the shared observability pipeline instead of a vendor-specific SDK.

#### Scenario: Browser runtime error is observable
- **WHEN** an instrumented browser app encounters an unhandled runtime error in a supported capture boundary
- **THEN** the app MUST emit an observable error event through the shared telemetry configuration
- **AND** the event MUST be attributable to the active route or user flow when that context exists

#### Scenario: Mobile runtime error is observable
- **WHEN** the mobile app encounters a handled or unhandled runtime failure in a supported capture boundary
- **THEN** the app MUST emit the failure through the shared telemetry configuration
- **AND** the emitted data MUST avoid secret values and raw user content
