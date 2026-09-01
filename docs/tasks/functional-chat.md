# Functional Chat Release Gate

The current chat-generation contract and architecture live in
[`../chat-generation.md`](../chat-generation.md).

This is the single ordered release gate for functional chat. The implementation
has moved from historical route-local generation to a canonical chat domain
contract and application-owned runtime. Task status describes current state,
not whether the original plan was once written.

1. [001 — Canonical chat domain contract](001-chat-domain-contract.md) — Implemented
2. [002 — Chat tool event round trips](002-chat-tool-event-round-trip.md) — Implemented
3. [003 — Chat end-to-end test infrastructure](003-chat-e2e-test-infrastructure.md) — Open
4. [004 — Typed generation boundaries](004-typed-generation-boundaries.md) — Partial
5. [005 — Deterministic generation crash recovery](005-generation-crash-recovery.md) — Open
6. [006 — Generation cursor recovery](006-generation-cursor-recovery.md) — Partial
7. [007 — Web/Omiro convergence](007-client-convergence.md) — Partial
8. [008 — Generation observability](008-generation-observability.md) — Partial
9. [009 — Generation runtime consolidation](009-generation-runtime-consolidation.md) — Implemented
10. [010 — Remove generation compatibility](010-remove-generation-compatibility.md) — Implemented
11. [011 — Functional chat shipping evidence](011-functional-chat-shipping-evidence.md) — Open

## Governing decisions

- [ADR 0002 — Canonical chat domain contract](../adr/0002-canonical-chat-domain-contract.md)
- [ADR 0003 — Application-owned chat workflows](../adr/0003-application-owned-chat-workflows.md)
- [ADR 0004 — Durable semantic events](../adr/0004-durable-semantic-events.md)

`Implemented` means the code path and focused automated evidence exist.
`Partial` means the foundation exists but release proof or boundary work does
not. `Open` means implementation is still required. `Blocked` is reserved for
an external dependency that prevents execution.

The next task is always the lowest-numbered task that is not `Implemented`.
Its exit gate must be satisfied and recorded before any later task is started;
an existing implementation in a later task does not waive an earlier gate.
