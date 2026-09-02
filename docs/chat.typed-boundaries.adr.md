# Chat typed boundaries and redacted diagnostics

## Status

Accepted (2026-09-02)

## Context

Chat receives untrusted provider chunks, tool arguments, persisted JSON, replay
cursors, SSE frames, and callback failures. TypeScript types alone do not
validate runtime input, while raw payloads in diagnostics can expose user or
provider data.

## Decision

Every external chat boundary has one owner, a runtime parser, and an explicit
malformed-input outcome. Provider chunks, fragmented tool calls, tool
arguments, persisted events/messages, SSE frames, replay cursors, and failure
callbacks are validated before they change state or execute an effect.

Errors and telemetry contain only allowlisted correlation, category, validation
path, and structural metadata. Provider content, chunks, tool arguments,
results, credentials, and other payloads are excluded by construction.

## Consequences

Malformed input is rejected, safely terminalized, or transport-closed by its
owning boundary. Diagnostics remain useful for correlating generation,
sequence, replay, recovery, terminal, and tool-effect outcomes without leaking
payloads. New boundary behavior requires a runtime contract and redaction
test.
