---
title: "Add authenticated import progress WebSocket"
status: "done"
priority: "high"
labels: [finance, websocket, realtime, auth]
depends_on: ["006-add-import-state-and-queue-contract.md", "012-build-import-worker.md"]
blocks: ["015-wire-frontend-job-state.md", "016-add-import-integration-tests.md", "017-run-copilot-end-to-end-verification.md"]
estimated_size: "L"
---

## Objective

Deliver authenticated live import progress with reconnect snapshots.

## Context

The API currently has no WebSocket upgrade wiring. The finance client expects progress and subscribed messages.

## Requirements

- Integrate `ws` and `injectWebSocket` with the Node server bootstrap.
- Authenticate upgrades with the existing Better Auth session cookie.
- Reject unauthenticated upgrades and query-string token auth.
- Support subscription to import progress.
- Filter every progress message to the connected user’s jobs.
- Send a current job snapshot after subscription.
- Forward Redis progress events to connected sockets.
- Remove dead sockets and subscriptions cleanly.

## Implementation Notes

- Prove cookie behavior against the actual finance/API origin configuration.
- Do not log WebSocket URLs containing credentials or private data.
- Keep Redis pub/sub fan-out safe for multiple API replicas.

## Acceptance Criteria

- [ ] A logged-in finance client connects using cookies only.
- [ ] An unauthenticated client is rejected.
- [ ] A reconnect receives current job state before the next progress tick.
- [ ] A user never receives another user’s job progress.
- [ ] Multiple API instances can forward worker progress.

## Testing

- Add WebSocket integration tests for auth, subscription, snapshots, filtering, reconnect, and cleanup.

