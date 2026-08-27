# Observability

Hominem uses two production observability surfaces with different jobs:

- Railway is the source of truth for live container, worker, build, HTTP, Redis,
  and database logs.
- Sentry is the source of truth for application errors, OpenTelemetry traces,
  trace-derived dashboards, and alerts.

Do not use Sentry as a live stdout log tail. Do not put OTLP credentials in the
Web bundle.

## Production logs and Sentry navigation

Pulling live logs, navigating Sentry, and the incident response procedure are
runbook steps — see the `hominem-observability` skill
(`.agents/skills/hominem-observability/`) for the exact commands and
navigation path.

The API and worker export directly to Sentry's generated OTLP endpoint. Configure
these Railway variables on both services:

- `OTEL_EXPORTER_OTLP_ENDPOINT`
- `OTEL_EXPORTER_OTLP_HEADERS` (URL-encoded, write-only Sentry headers)
- `OTEL_TRACES_SAMPLER_ARG`
- `SENTRY_DSN`

General root traces should normally use a 10% ratio. Speech traces are sampled
at 100% because the speech funnel is latency-sensitive and currently small.
Check the `telemetry_initialized` log after every deployment; it reports the
effective ratio.

## Instrumentation contract

Telemetry must remain bounded and privacy-safe. Never record prompts, model
outputs, message contents, email addresses, user IDs, message IDs, generation
IDs, provider URLs, authorization data, or provider error bodies in OTEL
attributes or exported log bodies.

### Speech lifecycle

The expected lifecycle is:

```text
chat.speech
  ├─ provider response / first audio byte
  ├─ browser speech.playback
  └─ speech.reconciliation.lookup
       └─ usage event with tokens and cost
```

Useful bounded attributes include `speech.feature`, `speech.character_count`,
`speech.provider_wait_ms`, `speech.time_to_first_audio_byte_ms`,
`speech.request_to_first_playable_ms`, `speech.stream_duration_ms`,
`speech.session_duration_ms`, `speech.audio_bytes`, `speech.outcome`,
`speech.usage_available`, `speech.total_tokens`, reconciliation attempt, and
reconciliation outcome.

The browser sends one terminal playback event through the authenticated API
proxy. The API converts it into a `speech.playback` span.

### Logs exported to Sentry

Railway receives all application stdout/stderr. OTEL log export is intentionally
allowlisted to operational messages and scalar fields, including HTTP request
start/completion; speech lifecycle events; usage reconciliation start, success,
retry, terminal failure, and missing generation ID; worker startup and speech
queue snapshots, completion, stall, and failure; and telemetry initialization.

This keeps Sentry useful for correlation without turning every application log
into an indexed event or leaking sensitive context.

## Dashboards and alerts

Alert ownership points to the API/service owner. Do not change provider or
deployment configuration based on a dashboard aggregate alone. The panel list
and recommended alert thresholds to set up are in the `hominem-observability`
skill (`.agents/skills/hominem-observability/`).

## Analytics backlog

### Completed in this observability pass

- Railway log wrapper with API, worker, Redis, and database aliases.
- Explicit production log/runbook documentation.
- Active HTTP span context so child AI and speech spans correlate with the
  originating request.
- Safe OTEL export of operational HTTP, worker, queue, AI usage, and speech logs.
- Speech reconciliation spans and bounded outcome/usage attributes.
- Speech queue startup, completion, stall, failure, and pending snapshot signals.
- Browser playback funnel and privacy constraints.
- Usage reconciliation health and missing-generation-ID visibility.

### Next product analytics work

- Add a bounded usage-page view/fetch/error event so empty, delayed, and failed
  usage reports can be distinguished from genuinely zero usage.
- Add feature adoption counts by feature, model family, voice, and response
  length, using coarse labels rather than raw request text.
- Add a chat funnel from message submitted → model stream started → first token
  → stream completed/failed → optional speech requested → playback completed.
- Add cost-per-successful-action and cost-per-user-session aggregates from the
  existing usage tables; keep raw billing data in PostgreSQL rather than Sentry.
- Add daily retention and repeat-use cohorts for chat speech and other AI
  features using the product analytics warehouse.
- Add a provider comparison dimension once more than one provider/model is
  active; do not expose provider generation IDs.

## Local and post-deploy verification

Run the `hominem-observability` skill's local verification loop
(foundation stack + Jaeger) and post-deploy check (confirm one
`speech.playback` span, one `chat.speech` trace, and a `succeeded`
reconciliation run) — see `.agents/skills/hominem-observability/`.
