---
type: task
id: WEB-CHAT-00
title: Approve web chat parity contract
status: proposed
priority: high
team: web
project: web-chat-parity
labels:
  - web
  - chat
  - product-decision
estimate: S
assignee: unassigned
depends_on: []
blocks:
  - WEB-CHAT-01
  - WEB-CHAT-04
  - WEB-CHAT-13
  - WEB-CHAT-18
---

# Approve web chat parity contract

## Context

The gap map identifies unresolved behavior around the mixed All surface,
server-backed cancellation, chat voice/audio behavior, message deletion, and
tool-call parity.

## Approved decisions

- Web remains chat-first at `/`; the mixed All surface is deferred.
- Stop uses the server-backed generation cancellation endpoint and aborts the
  browser stream.
- Web message deletion truncates from an eligible user message forward,
  requires confirmation, and uses optimistic rollback on failure.
- Voice/audio and tool-call presentation remain explicit follow-up decisions
  and are not silently expanded into this delivery slice.

## Decision

Record the approved web behavior for:

- whether web adopts the mixed All/inbox surface or keeps a chat-first home;
- whether cancellation must call the generation cancel endpoint;
- whether web supports Omiro's audio-response/walkie-talkie behavior;
- message delete confirmation and ownership behavior;
- whether tool-call approval should share the Omiro presentation or remain web-specific.

## Acceptance criteria

- Decisions are recorded in the governing product documentation.
- Dependent tasks reference the approved behavior and do not infer alternatives.
- Deferred behavior is explicitly marked out of scope.
