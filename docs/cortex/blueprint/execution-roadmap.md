---
title: Execution Roadmap
slug: /docs/cortex/blueprint/execution-roadmap
status: draft
owner: product
type: blueprint
summary: Defines the 0-to-1 milestone plan from MVP steel thread to growth and scale.
---

# Agile Roadmap: The 0-to-1 Path

## Roadmap Principle

Every milestone shall strengthen the core loop of capture, organization, retrieval, and action.

No milestone shall broaden the product into a multi-app suite unless the added capability makes the notes-first workspace materially stronger.

## Milestone 0: MVP / Steel Thread

### Goal

Prove that the product can turn rough capture into grounded reasoning and durable action inside one continuous workspace.

### Scope

- Ship a unified feed with notes and chats in one chronology.
- Ship fast note capture and basic chat creation.
- Support explicit note attachment into chat.
- Support immutable note version history.
- Support durable chat message history.
- Support full-text search across notes.
- Support AI actions for summarize, rewrite, and extract action items.
- Support promotion of chat output into note updates or new tasks.
- Ship account creation, email auth, OAuth auth, and session management.
- Ship audit event streaming for critical AI-driven mutations and sensitive trust actions.

### Acceptance Criteria

- A user can capture a thought, revisit it later, ask the workspace about it, and create a next step without leaving the product.
- The feed feels like the product home surface.
- Durable writes are reversible through history.
- AI-generated structured changes are reviewable.

## Milestone 1: Foundational

### Goal

Make the core workspace feel coherent, trustworthy, and collaboration-ready.

### Scope

- Add tags and explicit entity links.
- Add spaces, invitations, and membership roles.
- Add task views with status, priority, due date, and historical assignment.
- Add mobile voice capture and quick review flows.
- Add provenance UI for AI-suggested changes and approvals.
- Improve retrieval ranking with recency and relationship signals.
- Add passkeys and API keys.

### Acceptance Criteria

- The workspace supports both personal and bounded collaborative use without breaking the mental model.
- Users can understand what the AI changed and why.
- Search and context recall improve measurably over Milestone 0.

## Milestone 2: Growth / Scale

### Goal

Increase retention, compounding value, and operational scale without changing the core product thesis.

### Scope

- Add calendar import and event context.
- Add people and place objects for richer relationship memory.
- Add proactive context surfacing, follow-up reminders, and suggestion queues.
- Add deeper analytics for retrieval success, retention cohorts, and action conversion.
- Add export and portability workflows.
- Introduce dedicated search infrastructure only if PostgreSQL search becomes a bottleneck.

### Acceptance Criteria

- The product becomes more useful as history accumulates.
- Retrieval quality and action conversion improve with longer-lived use.
- The architecture sustains higher concurrency and larger histories without regressions in core UX.

## Release Sequence

1. Milestone 0 shall optimize for the shortest path to proving the steel thread.
2. Milestone 1 shall harden trust, structure, and collaboration.
3. Milestone 2 shall add compounding context and scale primitives.

## Metrics By Milestone

### Milestone 0

- capture completion rate
- feed revisit rate
- search-to-open success rate
- note-to-task conversion rate
- chat-assisted action rate

### Milestone 1

- collaboration activation rate
- approval acceptance rate for AI suggestions
- tagged and linked object density
- weekly retained workspace usage

### Milestone 2

- retrieval precision proxy score
- proactive suggestion acceptance rate
- export usage rate
- long-term retention by cohort

## Out-Of-Scope Until Revalidated

- full calendar authoring
- broad life-management modules as primary navigation
- complex workflow automation as a launch dependency
- feature work that weakens the one-feed, notes-first story
