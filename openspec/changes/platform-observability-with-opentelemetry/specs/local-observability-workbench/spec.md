## ADDED Requirements

### Requirement: Local telemetry stack is available for repo development
The system MUST provide a documented local observability environment that accepts telemetry from instrumented apps and services during development.

#### Scenario: Developer starts local observability stack
- **WHEN** a developer starts the local observability workbench using the documented repo workflow
- **THEN** the required collector and inspection services MUST start with repo-pinned configuration
- **AND** instrumented runtimes MUST be able to export telemetry to it without per-service manual reconfiguration

#### Scenario: Local stack tolerates partial service startup
- **WHEN** only a subset of apps or services are running locally
- **THEN** the workbench MUST continue accepting telemetry from the active runtimes
- **AND** missing services MUST NOT prevent inspection of the telemetry that is available

### Requirement: Developers can inspect traces, metrics, and logs from one local workflow
The system MUST make traces, metrics, and correlated logs inspectable through the local workbench so developers can debug multi-service flows without reading multiplexed terminal output alone.

#### Scenario: Developer inspects a distributed request locally
- **WHEN** a traced request spans client, API, and worker runtimes in local development
- **THEN** the developer MUST be able to inspect the resulting flow from one local observability workflow
- **AND** the workflow MUST expose enough correlation data to identify the participating runtimes

#### Scenario: Developer inspects service logs from telemetry context
- **WHEN** a developer views a trace or failing operation in the local workbench
- **THEN** the workflow MUST make the correlated structured logs discoverable for that operation
- **AND** the workflow MUST reduce dependence on raw Turborepo task output for root-cause analysis

### Requirement: Local observability workflow is documented and repeatable
The system MUST document how to enable telemetry locally, how to start the workbench, and how to verify that apps and services are exporting correctly.

#### Scenario: New developer follows observability setup guide
- **WHEN** a developer with the standard repo prerequisites enables local observability for the first time
- **THEN** the documentation MUST describe the required commands, environment variables, and expected endpoints
- **AND** the guide MUST include a smoke-check path for confirming successful telemetry export

#### Scenario: Local observability can be disabled cleanly
- **WHEN** a developer chooses not to run the local workbench
- **THEN** the repo MUST still support normal app and service startup
- **AND** instrumentation MUST fail soft when the local collector is unavailable
