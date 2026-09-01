# ADR 0004: Treat durable semantic events as the recovery authority

## Status

Accepted (2026-09-01)

## Decision

Durable semantic events, ordered by a server-owned safe-integer sequence, are
authoritative for replay and recovery. Projections, snapshots, and client
cursors are derived state or optimization aids. Text and reasoning deltas are
live-only. An event is appended before it is published or yielded, and the
first durable terminal decision wins races with cancellation or failure.

Replay subscribes before loading history, buffers concurrent publications, and
deduplicates overlap by generation and sequence. Tool effects use durable
idempotency keys; exactly-once behavior depends on the tool honoring that
protocol.

## Consequences

Reconnect and fresh-launch behavior can be tested against one authoritative
history. A failed append cannot be represented as a successful live event.
Client cursors must never be treated as proof that a durable event exists, and
live-only deltas must never advance them.
