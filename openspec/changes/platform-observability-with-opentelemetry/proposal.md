## Why

Local development currently depends on Turborepo task output and ad hoc logs, which makes it hard to isolate behavior by service, follow a request across boundaries, or inspect runtime failures with enough context. The repo also still carries a partial Sentry-era footprint even though Sentry is no longer part of the operating model.

We need a single observability foundation that works across web apps, mobile, and backend services, gives developers useful local telemetry by default, and replaces legacy error-monitoring hooks with an OpenTelemetry-first approach.

## What Changes

- Add a repo-wide OpenTelemetry standard for apps and services, including shared resource attributes, trace propagation, sampling policy, and correlated structured logs.
- Instrument backend services so HTTP requests, background jobs, external RPCs, and key infrastructure dependencies emit traces and metrics consistently.
- Instrument client applications so navigation, network activity, and user-facing failures can be correlated with backend traces where platform support allows.
- Add a local observability stack for development that receives telemetry from all instrumented runtimes and exposes traces, metrics, and logs for inspection.
- Remove remaining Sentry dependencies, initialization paths, and documentation so the repo uses a single observability model.

## Capabilities

### New Capabilities
- `platform-telemetry-standard`: Shared OpenTelemetry conventions for resource metadata, propagation, sampling, log correlation, and export behavior across runtimes.
- `service-runtime-observability`: Telemetry requirements for backend services, workers, and other long-running server processes.
- `client-runtime-observability`: Telemetry requirements for web and mobile clients, including correlation with backend request flows.
- `local-observability-workbench`: A local developer telemetry environment for collecting and inspecting traces, metrics, and logs without third-party hosted tooling.

### Modified Capabilities
- None.

## Impact

- Affected code: `apps/*`, `services/*`, shared logging/utilities packages, local dev scripts, and workspace dependency manifests.
- Affected dependencies: OpenTelemetry SDK/exporter packages, local collector/dashboard tooling, and removal of `@sentry/node`.
- Affected workflows: `bun run dev`, service startup conventions, local debugging, incident triage, and future production observability rollout.
- Expected outcome: every maintained runtime emits consistent telemetry, developers can inspect runtime behavior locally without relying on multiplexed Turbo logs alone, and the codebase no longer includes Sentry-specific integrations.
