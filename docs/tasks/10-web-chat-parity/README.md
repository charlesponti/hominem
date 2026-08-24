---
type: project-index
status: proposed
priority: high
team: web
project: web-chat-parity
labels:
  - web
  - chat
  - parity
source: ../../omiro-web-chat-gaps.md
---

# Web Chat Parity

Bring the current `apps/web` chat client to parity with the client capabilities
catalogued for Omiro. This project is intentionally split into independently
trackable tasks. Existing web behavior must remain usable while each gap is
implemented and verified.

## Delivery order

1. `WEB-CHAT-00`: approve the web parity contract and unresolved product decisions.
2. `WEB-CHAT-01`–`WEB-CHAT-05`: establish chat-first entry, composer, start-stream, cancellation, offline, and mutation foundations.
3. `WEB-CHAT-06`–`WEB-CHAT-12`: add message and conversation actions.
4. `WEB-CHAT-13`–`WEB-CHAT-17`: add mixed capture and Omiro content transformations.
5. `WEB-CHAT-18`–`WEB-CHAT-22`: close transformation, composer, voice, motion, and persistence parity.
6. `WEB-CHAT-23`: complete web acceptance and accessibility verification.

Tool-call approval, file upload, note mentions, and speech playback already
have web seams and are not duplicated as feature-addition tasks. Their missing
acceptance coverage is included in `WEB-CHAT-22`.
