# Observability

Hominem uses two production observability surfaces with different jobs:

- Railway is the source of truth for live container, worker, build, HTTP, Redis,
  and database logs.
- Sentry is the source of truth for application errors, OpenTelemetry traces,
  trace-derived dashboards, and alerts.

Do not use Sentry as a live stdout log tail. Do not put OTLP credentials in the
Web bundle.

## Production logs

The repository includes a safe wrapper around the Railway CLI:

```bash
scripts/railway-logs.sh api --since 1h
scripts/railway-logs.sh worker --filter '@level:error OR @level:warn'
scripts/railway-logs.sh api --http --status '>=400' --since 1h
scripts/railway-logs.sh worker --follow
scripts/diagnose-speech.sh 30m
```

Supported service aliases are `api`, `worker`, `redis`, and `database`. The
script selects the Hominem production project explicitly, so it does not depend
on the caller's locally linked Railway project. Override the project or
environment when needed:

```bash
RAILWAY_PROJECT_ID=<project-id> RAILWAY_ENVIRONMENT=staging \
  scripts/railway-logs.sh api --since 30m
```

The equivalent repository script is:

```bash
scripts/railway-logs.sh api --lines 200
```

The dashboard path is Railway → Hominem → environment → service → Logs. Choose
API for HTTP/runtime logs, worker for queue processing, Redis for cache health,
and database for database service events. Use the HTTP log view when a request
status, path, duration, or Railway request ID is more useful than an application
structured log.

For an incident-oriented speech report, `scripts/diagnose-speech.sh` combines
API and worker log filters with the GitHub Actions status for the current commit.
For aggregate database verification, set an explicit `DATABASE_URL` and run
`scripts/diagnose-usage.sh`; it reports reconciliation states, missing usage
events, and current-month feature totals without printing individual users.

## Sentry

In Sentry, select the `hominem` project before interpreting the issue list. The
main navigation is:

- Issues: unhandled exceptions and application errors.
- Explore → Traces: `chat.speech`, `speech.playback`,
  `speech.reconciliation`, and `http.server` spans.
- Dashboards: latency, failure, usage, and reconciliation panels.
- Monitors: threshold alerts and notification ownership.

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

Create a Sentry Explore dashboard with these panels:

1. API speech p50/p95 `speech.time_to_first_audio_byte_ms`.
2. Browser p50/p95 `speech.request_to_first_playable_ms`.
3. Speech request count by `speech.outcome` and service.
4. Browser playback count by completed, stopped, and failed.
5. Reconciliation success, retry, missing-generation-ID, and terminal-failure
   counts.
6. Usage-available ratio for `chat_speech`.
7. API p50/p95 latency and 4xx/5xx rate by `http.route`.
8. Worker queue snapshots and stalled-job count.

Recommended alerts:

- browser first playable p95 above 5 seconds for five minutes;
- failed browser playback above 5% for five minutes;
- any missing generation ID after a successful provider stream;
- reconciliation terminal failures greater than zero;
- usage-available ratio below 99% over 15 minutes;
- pending speech runs older than five minutes;
- API 5xx rate above 2% for five minutes;
- any worker queue stalled event;
- Redis/database connectivity failure from `/api/status`.

Alert ownership should point to the API/service owner. The response procedure is
Railway logs → Sentry trace waterfall → database usage/reconciliation rows →
local reproduction. Do not change provider or deployment configuration based on
a dashboard aggregate alone.

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

## Local verification

Run the foundation stack before starting the API or worker:

```bash
cd ~/Developer/infra/foundation
just up
just health
just logs otel-collector
```

Jaeger is available at `http://localhost:16686`. Local application logs remain
in the API or worker terminal. Stop the foundation stack when finished with:

```bash
cd ~/Developer/infra/foundation
just down
```

After deployment, authenticate a controlled Web session, play one response, and
verify exactly one `speech.playback` span and one API `chat.speech` trace. Then
confirm that the usage event becomes available and the reconciliation run ends
in `succeeded`.
