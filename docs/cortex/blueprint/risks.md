---
title: Risks
slug: /docs/cortex/blueprint/risks
status: draft
owner: product
type: blueprint
summary: Defines the primary technical and market risks and their mitigation plans.
---

# Risk And Mitigation Matrix

## Technical Risks

| Risk | Why It Matters | Mitigation Strategy |
| --- | --- | --- |
| Retrieval quality is poor | Chat becomes generic, hallucinatory, or disconnected from user context | Start with explicit note attachments, user- and space-scoped retrieval, and evaluation datasets for common reasoning tasks; log retrieval outcomes and tune ranking iteratively |
| Feed and search latency rises with history size | The core loop fails if capture and recall feel slow | Use cursor pagination, ordered activity indexes, bounded retrieval windows, asynchronous indexing, and read models only when latency targets are missed |
| AI mutations reduce user trust | Users will stop using write-capable AI if changes feel opaque or unsafe | Require provenance for durable writes, preserve immutable note history, add explicit approval for consequential changes, and emit audit events for all high-risk actions |

## Market Risks

| Risk | Why It Matters | Mitigation Strategy |
| --- | --- | --- |
| The product is perceived as a generic notes app with AI | Weak differentiation reduces willingness to switch and retain | Position around continuity, grounded reasoning, and memory-to-action workflow rather than generic assistant framing |
| Scope creep revives the older Life OS sprawl | Product story and execution become diffuse | Gate roadmap additions through a single test: the feature must strengthen the notes-first workspace core loop |
| Users churn after initial curiosity | Early novelty does not produce durable habit formation | Optimize for second-week retrieval wins, resurfaced context value, and repeated capture-to-action loops rather than one-time wow moments |

## Risk Monitoring

### Technical

- Track $P95$ latency for capture, feed, and search.
- Track retrieval success proxies through click-through and accepted-context actions.
- Track AI mutation rejection and rollback rates.

### Market

- Track week-1 to week-4 retention.
- Track percentage of active users completing the core loop:

$$
CoreLoopRate = \frac{\text{users completing capture, revisit, and action}}{\text{active users}}
$$

- Track repeat usage of grounded chat over ungrounded chat.

## Escalation Triggers

- If $P95_{feed} > 400\,ms$ for sustained periods, prioritize feed-query hardening before new feature expansion.
- If AI mutation rejection exceeds agreed trust thresholds, reduce write surface area and tighten approval requirements.
- If collaboration usage remains low after Milestone 1, postpone broader shared-workspace investments and refocus on solo retention.

## Mitigation Principles

1. The product shall preserve trust over automation.
2. The roadmap shall preserve coherence over feature breadth.
3. The architecture shall preserve operational simplicity until scale forces additional complexity.
