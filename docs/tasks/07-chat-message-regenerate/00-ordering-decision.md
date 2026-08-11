---
type: task
id: CHAT-REGENERATE-00
title: Approve assistant regeneration ordering semantics
status: blocked
priority: urgent
team: chat
project: chat-message-regenerate
labels:
  - product-decision
  - chat
  - data-integrity
estimate: S
assignee: unassigned
depends_on: []
blocks:
  - CHAT-REGENERATE-01
  - CHAT-REGENERATE-02
---

# Approve assistant regeneration ordering semantics

Choose exactly one behavior when regenerating an assistant message that has later messages:

- `replace-one`: replace only the selected assistant response and preserve later messages, with an explicit rule for how later history references the replacement;
- `truncate-forward`: delete the selected assistant message and every later message, then stream a replacement from the preceding history.

Record behavior for the last assistant message, a middle assistant message, concurrent streaming, cancellation, and retry. Define whether regenerated messages retain IDs or receive new IDs. Define the user-facing confirmation/destructive warning, if any.

## Acceptance criteria

- The selected semantics are approved and written here.
- The database mutation, cache update, and tests can be derived without interpretation.
- Usage-limit and failure behavior are explicitly included in the decision.
