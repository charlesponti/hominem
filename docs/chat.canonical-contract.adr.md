# Chat canonical contract

## Status

Accepted (2026-09-01)

## Decision

Chat snapshots, message attachments, tool-call records, lifecycle invariants,
generation event schemas, parsers, reducers, deduplication, and provider
tool-call reconstruction live in `@hominem/chat`. Database and transport
packages validate and adapt at their boundaries but do not duplicate these
contracts.

The shared contract also owns the lifecycle fixture used to verify fragmented
provider tool calls, confirmation, failure, retry, commitment, and duplicate
event reduction across persistence, replay, Web, and Omiro.

Confirmation state and execution outcome remain separate fields. Legacy
overloaded `status` values are not accepted in this greenfield system.

## Consequences

There is one runtime schema owner and one semantic reducer. DB and RPC contract
tests can detect drift without maintaining parallel structural types. New
shared chat behavior must be added to `@hominem/chat`; protocol-specific
framing remains local to its transport.
