## 1. Shared Telemetry Foundation

- [ ] 1.1 Create shared OpenTelemetry configuration utilities for resource attributes, environment parsing, exporter setup, and sampling controls
- [ ] 1.2 Define the repo-wide telemetry naming and correlation contract for services, apps, requests, jobs, and deployment environments
- [ ] 1.3 Update shared logging utilities so structured logs can include telemetry correlation fields without duplicating bootstrap logic
- [ ] 1.4 Document required environment variables and safe defaults for disabled, local, and hosted telemetry modes

## 2. Backend Service And Worker Instrumentation

- [ ] 2.1 Instrument `services/api` startup and inbound HTTP handling with OpenTelemetry server spans and request correlation
- [ ] 2.2 Instrument worker entrypoints and job execution paths in `services/workers` with job-scoped spans, retry metadata, and failure recording
- [ ] 2.3 Add instrumentation for key outbound dependency boundaries used by services and workers, including network, queue, and database-adjacent operations
- [ ] 2.4 Verify backend runtimes propagate trace context across request-to-worker and service-to-service boundaries

## 3. Client Runtime Instrumentation

- [ ] 3.1 Instrument maintained web apps for route transitions, outbound API requests, and client runtime failure capture
- [ ] 3.2 Add shared browser trace propagation so client requests correlate with backend traces
- [ ] 3.3 Instrument `apps/mobile` for lifecycle transitions, outbound requests, and supported runtime error capture
- [ ] 3.4 Verify browser and mobile telemetry produce traceable end-to-end flows into backend services

## 4. Local Observability Workbench

- [x] 4.1 ~~Add a repo-pinned local collector and dashboard configuration for traces, metrics, and logs~~ → Use external universal stack at `~/.local/observability`
- [x] 4.2 ~~Create a documented local workflow to start the observability stack alongside `bun run dev`~~ → Use `~/.local/observability/observability.sh start` before running project
- [ ] 4.3 Verify developers can inspect correlated traces, metrics, and logs for a multi-runtime local flow from one workflow
- [ ] 4.4 Ensure apps and services continue to start cleanly when the local collector is unavailable or telemetry is disabled

**Note:** The local observability stack has been extracted to a universal, cross-project location at `~/.local/observability`. This Grafana LGTM (Loki + Grafana + Tempo + Mimir) stack serves all projects, not just hominem.

**To use with hominem:**
```bash
# 1. Start the central observability stack (if not already running)
~/.local/observability/observability.sh start

# 2. Configure hominem to export to it
source .observability.env

# 3. Run your app
bun run dev
```

**Access:** http://localhost:3000 (admin/admin)

## 5. Sentry Removal And Verification

- [ ] 5.1 Remove remaining Sentry dependencies, initialization paths, and configuration references from the repo
- [ ] 5.2 Replace any Sentry-specific error capture paths with shared telemetry and structured logging hooks
- [ ] 5.3 Add or update tests and smoke checks that validate telemetry bootstrap, propagation, and failure capture behavior
- [ ] 5.4 Update developer documentation to describe the OpenTelemetry-only observability model and local debugging workflow
