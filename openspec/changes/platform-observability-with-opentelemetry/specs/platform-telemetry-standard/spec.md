## ADDED Requirements

### Requirement: Shared telemetry identity and metadata
The system MUST define a shared telemetry standard for all instrumented runtimes, including stable service names, deployment environment labels, version metadata, and tenant-safe correlation fields.

#### Scenario: Runtime boots with standard resource attributes
- **WHEN** any maintained app or service initializes telemetry
- **THEN** it MUST emit resource metadata including service name, service version, runtime environment, and deployment environment
- **AND** resource naming MUST follow one repo-wide convention

#### Scenario: Telemetry metadata avoids sensitive payload leakage
- **WHEN** telemetry attributes are attached to traces, metrics, or logs
- **THEN** the standard MUST prohibit secrets, raw tokens, passwords, and unsanitized personal data from being emitted
- **AND** shared helpers MUST define the approved correlation fields

### Requirement: Trace context propagation is consistent across boundaries
The system MUST propagate trace context across inbound requests, outbound requests, and asynchronous handoff boundaries so related work can be inspected as one flow.

#### Scenario: HTTP request flow preserves trace lineage
- **WHEN** a client request enters a service and that service performs downstream network work
- **THEN** the downstream operation MUST continue the active trace context
- **AND** correlated spans MUST share the same trace identifier

#### Scenario: Background work continues originating context
- **WHEN** a request or scheduled task enqueues background work for a worker
- **THEN** the enqueue path MUST persist enough trace context for the worker to resume the flow or link back to it
- **AND** the worker telemetry MUST expose the relationship between the originating operation and the job execution

### Requirement: Structured logs are telemetry-correlated
The system MUST preserve structured logging and MUST correlate logs with active telemetry context where a trace or span is present.

#### Scenario: Request-scoped logs include correlation fields
- **WHEN** a service emits logs while handling a traced request
- **THEN** each log entry MUST include service identity and request correlation fields
- **AND** trace and span identifiers MUST be present when an active span exists

#### Scenario: Job-scoped logs include correlation fields
- **WHEN** a worker emits logs while handling a traced job
- **THEN** each log entry MUST include worker identity and job correlation fields
- **AND** trace linkage fields MUST be present when the job participates in a distributed trace

### Requirement: Telemetry can be enabled and tuned by environment
The system MUST expose environment-driven controls for exporter endpoints, sampling behavior, and telemetry enablement so local, CI, and hosted environments can use the same instrumentation contract.

#### Scenario: Local development routes telemetry to local workbench
- **WHEN** a developer runs the repo with local observability enabled
- **THEN** instrumented runtimes MUST export telemetry to the configured local collector
- **AND** no code changes SHALL be required to switch from disabled to enabled local telemetry

#### Scenario: High-overhead telemetry can be reduced outside debugging sessions
- **WHEN** a runtime starts in an environment with conservative telemetry settings
- **THEN** sampling and exporter behavior MUST honor the configured environment policy
- **AND** the runtime MUST continue to start successfully even when exporters are disabled
