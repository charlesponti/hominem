# Observability

## Local

Run `just observability up` to start the loopback-only OpenTelemetry Collector and Jaeger stack. API and worker traces use the OTLP HTTP endpoint in the local API environment. Jaeger is available at `http://localhost:16686`; use `just observability logs` to inspect Collector debug output.

Speech spans are sampled at 100%. Other root API and worker spans use the configured 10% default. Exported speech attributes contain timing, outcome, byte, and count data only; they do not contain prompts, outputs, user IDs, message IDs, generation IDs, URLs, or provider error bodies.

## Production

API and worker services export directly to Sentry’s generated OTLP endpoint. Configure these Railway variables on each service:

- `OTEL_EXPORTER_OTLP_ENDPOINT`: the Sentry OTLP base endpoint.
- `OTEL_EXPORTER_OTLP_HEADERS`: write-only Sentry authentication headers, encoded as comma-separated `key=value` pairs. URL-encode header values.
- `OTEL_TRACES_SAMPLER_ARG`: `0.1` for the general root-span sampling ratio.
- `SENTRY_DSN`: the existing Sentry error-reporting DSN.

Never add the OTLP endpoint or headers to Web variables. Browser playback sends one bounded terminal event to authenticated `POST /api/telemetry/events`; the API converts it into a `speech.playback` span.

### Sentry views and alerts

Create an Explore dashboard using spans where `speech.*` or `telemetry.source:web` attributes are present. The initial panels should cover:

- p50/p95 `speech.time_to_first_audio_byte_ms` for API spans;
- p50/p95 `speech.request_to_first_playable_ms` for browser playback spans;
- total `speech.session_duration_ms` and playback count by `speech.outcome`;
- cancellation and failure rates by service and environment.

Alert on a sustained five-minute p95 above 5,000 ms for browser first-playable time, and a sustained five-minute failed-playback ratio above 5%. The API/service owner acknowledges these alerts, checks Sentry trace waterfalls and provider timing, then verifies the local reproduction path before changing provider or deployment configuration.

Retention follows the organization’s Sentry-plan defaults. Review retention and alert ownership whenever the Sentry project or Railway service ownership changes.

### Verification

After deployment, authenticate a controlled Web session, play one response, and confirm a single `speech.playback` span is present with an outcome and bounded timing values. Confirm the API `chat.speech` trace contains provider wait, first-byte, stream completion, or cancellation spans as applicable. Verify that no message, user, generation, or provider-error identifiers are present in attributes or event bodies.
