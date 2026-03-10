## Context

The current repo has partial observability building blocks but no coherent telemetry architecture. Backend code already uses a shared `pino` logger, the Hono RPC layer attaches request IDs, and Turborepo coordinates local development, but developers still rely on multiplexed terminal output to understand multi-service behavior. The API package also retains a Sentry dependency even though Sentry is no longer an active platform dependency.

This change spans all maintained runtimes in the monorepo: browser apps, the mobile app, backend services, and shared local development tooling. It introduces new dependencies, new startup conventions, and a migration away from leftover Sentry-era patterns, so it benefits from an explicit design before implementation.

## Goals / Non-Goals

**Goals:**
- Define one OpenTelemetry-based observability model for apps and services.
- Correlate logs, traces, and metrics across request-driven and job-driven flows.
- Make local development telemetry inspectable through a collector and dashboards instead of raw terminal output alone.
- Remove Sentry dependencies and replace them with repo-owned telemetry primitives.
- Standardize instrumentation boundaries so future apps and services inherit the same baseline.

**Non-Goals:**
- Select or implement a production hosted observability vendor in this change.
- Instrument every library call at maximum detail from day one.
- Redesign business-domain logging outside the metadata needed for telemetry correlation.
- Replace Turborepo as the local process orchestrator.
- Guarantee feature parity across browser and React Native telemetry where platform SDK support differs.

## Decisions

1. Use OpenTelemetry as the single instrumentation contract
- Decision: Standardize on OpenTelemetry APIs, SDKs, semantic conventions, and context propagation across all runtimes.
- Rationale: It avoids vendor lock-in, supports local and future hosted backends, and gives a shared vocabulary for traces and metrics.
- Alternative considered: Keep `pino`-only logging plus ad hoc metrics. Rejected because logs alone do not provide request lineage or cross-service timing analysis.

2. Keep logging and tracing separate but correlated
- Decision: Retain structured application logs, but require trace and span identifiers to be attached so logs can be navigated from traces and vice versa.
- Rationale: The repo already has useful logging patterns; correlation is lower-risk than replacing logging wholesale.
- Alternative considered: Replace all logging with OpenTelemetry logs immediately. Rejected because OTEL log maturity and ecosystem ergonomics are less consistent than trace/metric support.

3. Introduce a local collector-based workbench
- Decision: Send local telemetry to a collector-managed stack that exposes traces, metrics, and logs from one place during development.
- Rationale: This directly solves the local debugging problem and decouples instrumentation from any future hosted backend choice.
- Alternative considered: Export directly from each service to separate local tools. Rejected because it increases duplication and configuration drift.

4. Instrument backend runtimes first, then clients
- Decision: Roll out service and worker instrumentation before browser/mobile instrumentation, then add frontend propagation and error visibility on top.
- Rationale: Backend traces provide the highest leverage and give client telemetry somewhere meaningful to connect.
- Alternative considered: Instrument every runtime in parallel. Rejected because it increases rollout complexity and makes debugging instrumentation issues harder.

5. Define a shared telemetry package for repo conventions
- Decision: Centralize resource attributes, exporter configuration, environment parsing, and instrumentation helpers in shared packages instead of duplicating bootstrap logic in each app or service.
- Rationale: The repo values small focused files and zero duplication, and observability drift becomes expensive quickly.
- Alternative considered: Let each runtime wire OTEL independently. Rejected because inconsistent naming and propagation would undermine the purpose of standardization.

6. Remove Sentry completely instead of dual-running
- Decision: Delete remaining Sentry dependencies and initialization paths as part of the observability migration rather than maintaining both systems.
- Rationale: The user no longer wants Sentry, and dual-running would add cost and confusion without long-term value.
- Alternative considered: Keep Sentry temporarily for error capture. Rejected because the change is intended to establish one canonical model, not prolong the old one.

7. Treat mobile as a best-effort OTEL client with strict backend correlation requirements
- Decision: Require mobile telemetry for app lifecycle, navigation, network requests, and handled/unhandled errors where supported, but prioritize propagation into backend traces over full parity with browser instrumentation.
- Rationale: React Native telemetry support can vary by library and runtime, so the design should protect the most valuable outcomes first.
- Alternative considered: Hold the entire change until mobile reaches exact parity. Rejected because it would block progress across every other runtime.

## Risks / Trade-offs

- [Instrumentation overhead increases local and CI runtime cost] → Mitigation: use environment-based sampling and keep verbose exporters disabled by default outside local observability sessions.
- [Collector/dashboard stack adds setup complexity] → Mitigation: provide one documented local entrypoint and version-pin the stack configuration in-repo.
- [Browser and mobile support differ across SDKs] → Mitigation: define required telemetry outcomes at the capability level and allow platform-specific implementation details.
- [Trace context is lost at async boundaries or queue handoff] → Mitigation: require explicit propagation for HTTP clients, worker enqueue/dequeue paths, and background job execution.
- [Logs become noisier without field conventions] → Mitigation: define a shared log schema with required service name, environment, request/job IDs, and correlated trace metadata.
- [Migration removes Sentry before equivalent visibility exists] → Mitigation: stage removal after local collector wiring and core backend instrumentation are functioning.

## Migration Plan

1. Add the shared telemetry foundation package(s), environment contract, and local collector/dashboard configuration.
2. Instrument backend entrypoints first: API server startup, request middleware, outbound HTTP/database/queue boundaries, and worker process/job execution.
3. Update logging to include service metadata and trace correlation fields while preserving existing structured log usage.
4. Remove Sentry dependencies and initialization code once backend telemetry is emitting to the local workbench.
5. Instrument browser apps for route transitions, outbound API calls, and surfaced runtime errors with trace propagation into backend requests.
6. Instrument the mobile app for app lifecycle, navigation, outbound requests, and error capture where SDK support allows.
7. Verify cross-runtime correlation with documented smoke scenarios, then make the telemetry baseline part of app/service startup conventions for future work.
8. Rollback strategy: disable OTEL exporters via environment flags, revert runtime bootstrap hooks, and temporarily fall back to structured logs only if instrumentation destabilizes startup.

## Open Questions

- Which local stack should be the default workbench: Grafana LGTM, SigNoz, or another collector-first bundle that runs well with Bun- and React-based workflows?
- Which metrics are mandatory in the first rollout versus deferred to a later optimization pass?
- Should frontend session replay or user-interaction analytics remain explicitly out of scope for this change?
- How much production-specific exporter configuration should live in this proposal versus a later environment rollout change?
