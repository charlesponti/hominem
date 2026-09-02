---
title: 'Prove Web and Omiro client convergence'
status: 'Implemented'
priority: 'high'
labels: [chat, web, omiro, replay, testing]
depends_on: [006-generation-cursor-recovery.md]
blocks: [008-generation-observability.md, 011-functional-chat-shipping-evidence.md]
estimated_size: 'L'
---

## Outcome

Equivalent canonical chat events produce equivalent semantic state in Web and
Omiro while platform transport and lifecycle code remain separate.

## Scope

In scope: shared fixture matrix, platform reducers, replay overlap, interruption,
and semantic comparisons. Out of scope: API runtime redesign and product
behavior not represented by canonical events.

## Work sequence

| ID    | Work item                   | Owner boundary      | Depends on | Validation / artifact | Done when                                                                                                           |
| ----- | --------------------------- | ------------------- | ---------- | --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| W-001 | Build shared fixture matrix | shared chat tests   | Task 006   | fixture manifest      | Send, start, regenerate, confirmation, cancellation, retry, failure, commit, reconnect, and launch are represented. |
| W-002 | Reduce equivalent events    | Web/Omiro clients   | W-001      | client reducer tests  | Phase, cursor, content, tools, errors, confirmation, and terminal meaning match.                                    |
| W-003 | Verify interrupted delivery | transport lifecycle | W-002      | replay/overlap tests  | Live/replay overlap and forced interruption converge without duplicates.                                            |

## Acceptance criteria

- [x] AC-001: The same fixture yields equal semantic state on both clients.
- [x] AC-002: No duplicate durable application or cursor advancement from live-only deltas occurs.
- [x] AC-003: Active and terminal states have equivalent lifecycle meaning.

## Validation record

- Shared comparison fixture: `toolEventRoundTripFixture()` is consumed through
  the Web Fetch/SSE parser and the Omiro XHR/SSE parser. Both reduce to
  `committed`, durable sequence `11`, text `Saved`, completed `search`, and
  failed `write_memory`.
- Web lifecycle coverage: stream interruption resumes from the saved durable
  cursor, duplicate durable frames are suppressed, active checkpoints reattach,
  terminal replay clears storage, and a replay close after durable commit is
  reconciled through the generation GET.
- Omiro lifecycle coverage: XHR interruption resumes from the saved cursor,
  duplicate durable events are suppressed, MMKV checkpoints reattach, and
  committed checkpoints clear after terminal delivery.
- API replay coverage supplies the same ordered durable event contract to both
  transports, including overlap deduplication and terminal handoff.
- Validation run: full uncached `TURBO_FORCE=true pnpm run check` passed
  (26/26 tasks; Web 184 tests, Omiro 481 tests, API 288 tests, DB 27 tests),
  and `git diff --check` passed.

## Exit gate

Closed. The shared fixture, matching Web/Omiro semantic output, platform
transport tests, and API replay integration coverage are recorded above. No
platform-specific semantics were added to make the fixture pass. Browser and
device product evidence remains owned by Task 011.
