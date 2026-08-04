---
title: "Phase 2: WebSocket server for live import progress"
order: 8
phase: app-wiring
status: blocked
depends_on: ["07-import-worker"]
blocked_by_decisions: []
area: backend
---

# WebSocket server for live import progress

## Summary

`services/api` runs Node + `@hono/node-server` (`services/api/src/index.ts`) with no WS upgrade wired up anywhere today. The frontend (`apps/finance/app/store/websocket-store.ts`) already implements a full reconnecting WS client expecting `'import:progress'`/`'subscribed'` message types — this task builds the missing server side.

## Work

1. Add `ws` as a dependency and expose the `/api/finance/import/ws` upgrade route through `upgradeWebSocket` from `@hono/node-server`.
2. On connect: authenticate the upgrade request using the Better Auth session cookie already used by normal API requests. Reject unauthenticated upgrades; do not accept `?token=`.
3. On `{ type: 'subscribe' }`: subscribe the connection to the `import:progress` Redis pub/sub channel (`packages/queues/src/consts.ts` — already defined, currently unused), filtering to the connected user's jobs.
4. Send a `'subscribed'` ack that includes a **current snapshot** of the user's active jobs (same data as task `06`'s route) — not just an empty ack, so a reconnect mid-import doesn't show stale/blank progress until the next batch tick.
5. Forward each relevant `import:progress` publish to the user's open socket(s).
6. Update `apps/finance/app/store/websocket-store.ts` to stop appending the session token to the URL. The normal browser cookie must be sent on the upgrade request.

## Edge cases / gotchas

- This is real new infrastructure, not a footnote — no existing WS wiring anywhere in `services/api` to extend.
- Multi-instance correctness is unconfirmed but should already be correct-by-construction if it applies: Redis pub/sub fans out to every subscribed replica, and each replica only forwards to sockets it's actually holding. No docker-compose/k8s/fly config exists in this repo to confirm multi-instance deployment either way.

## Decision D3 (auth mechanism) — resolved

The frontend currently connects with `?token=` (`websocket-store.ts:133`), but the API's real auth is the Better Auth session cookie (`services/api/src/middleware/auth.ts`). Remove the query parameter and prove cookie authentication against the actual finance/API origin configuration before completion.

Query-string tokens also risk leaking into access/proxy logs, worth weighing against (a)'s simplicity.
