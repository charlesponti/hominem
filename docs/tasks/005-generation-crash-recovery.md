---
title: 'Deterministic generation crash recovery'
status: 'Open'
priority: 'urgent'
labels: [chat, recovery, database, reliability]
depends_on: [004-typed-generation-boundaries.md]
blocks: [006-generation-cursor-recovery.md, 008-generation-observability.md]
estimated_size: 'XL'
---

## Current boundary

The request-bound generation service, machine, interpreter, snapshots, durable
events, cancellation, and tool-effect ledger exist. There is not yet a
fresh-launch recovery operation that safely resumes or terminalizes an
interrupted run.

## Remaining change

Boundary: generation lookup/event cursor → application recovery operation →
machine/interpreter.

Specify and implement recovery for provider turns, confirmation waits,
snapshot read/write, cancellation races, terminal appends, and replayed tool
effects. Load the owner-scoped run and durable cursor, rebuild semantic state,
resume only from a valid checkpoint, or append exactly one deterministic
terminal outcome. The first durable terminal decision wins. A reused tool
effect returns its stored result without invoking MCP.

## Exit gate

Task 005 is complete only when failure injection interrupts provider output,
confirmation wait, snapshot read/write, cancellation, terminal append, replay
write, and fresh launch. Each case must verify the durable event sequence,
projection, first-terminal-wins behavior, owner scoping, and tool-effect reuse
after recovery. API integration tests must prove resume versus deterministic
terminalization for every active phase.

Task 006 must not start until recovery evidence demonstrates that a recovered
run has an authoritative durable cursor.
