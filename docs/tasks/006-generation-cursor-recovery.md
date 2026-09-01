---
title: 'Restore generation cursors across reconnects'
status: 'Partial'
priority: 'high'
labels: [chat, replay, web, omiro]
depends_on: [005-generation-crash-recovery.md]
blocks: [007-client-convergence.md, 011-functional-chat-shipping-evidence.md]
estimated_size: 'L'
---

## Outcome so far

The server subscribes before replay, buffers concurrent publications, replays
ordered durable events, and deduplicates overlap by generation and sequence.
Web and Omiro use the canonical reducer and platform replay transports
(`Last-Event-ID` and `afterSequence`). Early consumer termination closes the
replay subscription.

## Remaining change

Boundary: Web/Omiro lifecycle storage → replay cursor → API replay operation.

Persist and restore active generation ID, phase, and last durable sequence where
each platform needs it. Validate cursors as non-negative safe integers. Before
opening a stream after launch, look up terminal state and render it without
resuming work. Test every reconnect cut point and prove live-only deltas never
advance the cursor.

## Exit gate

Task 006 is complete only when Web and Omiro persist/restore cursor state for
send, start, regenerate, confirmation, retry, reconnect, and fresh launch; API
tests prove subscribe-before-load, buffering, overlap deduplication, terminal
stop, invalid-cursor rejection, and lossless handoff; and a test proves that a
live-only delta cannot advance the durable cursor.

Task 007 must not start until both platforms pass this matrix against the same
server event fixtures.
