## ADDED Requirements

### Requirement: Service entrypoints emit server telemetry
The system MUST instrument backend service entrypoints so inbound server work creates traces and metrics by default.

#### Scenario: HTTP service request creates a root span
- **WHEN** an instrumented backend service receives an inbound HTTP request
- **THEN** the service MUST create or continue a server span for the request
- **AND** the span MUST record request outcome metadata including route shape and response status

#### Scenario: Service startup exposes telemetry identity
- **WHEN** a backend service process starts successfully
- **THEN** the telemetry bootstrap MUST register the service identity before handling requests
- **AND** startup MUST fail closed or log an actionable initialization error if required telemetry configuration is invalid

### Requirement: Background workers emit job telemetry
The system MUST instrument worker runtimes so queue polling, job execution, retries, and failures are visible through traces and metrics.

#### Scenario: Worker job execution is traced
- **WHEN** a worker begins processing a queued job
- **THEN** the worker MUST create or continue a span that represents that job execution
- **AND** the span MUST include job type and execution outcome metadata

#### Scenario: Worker failure is observable
- **WHEN** a worker job fails or is retried
- **THEN** telemetry MUST record the failure outcome and retry attempt
- **AND** correlated logs MUST make the failing job identifiable without exposing sensitive payload data

### Requirement: Service dependencies produce observable spans
The system MUST instrument key backend dependency boundaries so developers can inspect latency and failure sources inside a request or job flow.

#### Scenario: Outbound dependency call is visible in traces
- **WHEN** a service or worker performs an outbound network or infrastructure operation that participates in request or job handling
- **THEN** the operation MUST emit a child span or linked span
- **AND** dependency failures MUST be represented in telemetry with actionable error metadata

#### Scenario: Database and queue boundaries are attributable
- **WHEN** a service or worker interacts with the database or queue infrastructure during a traced operation
- **THEN** telemetry MUST expose those boundaries in a way that helps distinguish application time from infrastructure time
- **AND** the emitted attributes MUST avoid raw query payloads or secret material

### Requirement: Service runtime errors are emitted through the shared telemetry pipeline
The system MUST route backend runtime failures through the shared observability stack rather than vendor-specific error capture code.

#### Scenario: Unhandled service exception is observable without Sentry
- **WHEN** a service or worker encounters an unhandled exception or rejected promise
- **THEN** the failure MUST be recorded through the shared telemetry and logging pipeline
- **AND** the implementation MUST NOT require Sentry SDK initialization

#### Scenario: Legacy Sentry dependency is removed
- **WHEN** backend observability migration is complete
- **THEN** service packages MUST no longer depend on Sentry SDK packages
- **AND** runtime startup MUST not reference Sentry-specific configuration or APIs
