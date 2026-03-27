---
title: Product Requirements Document v1.0
slug: /docs/cortex/blueprint/prd
status: draft
owner: product
type: blueprint
summary: Defines the v1 product requirements, personas, feature inventory, and success criteria.
---

# Product Requirements Document v1.0

## Product Thesis

The product is a notes-first personal workspace that unifies capture, memory, reasoning, and lightweight action in one continuous system.

The primary product surface is a unified feed containing notes and chats in a shared chronology.

## Product Objective

The system shall let a user capture incomplete thoughts quickly, retrieve them later with relevant context, reason over them through chat, and convert them into durable next steps without switching tools.

## Product Principles

1. The system shall keep notes at the center of gravity.
2. The system shall optimize for capture before structure.
3. The system shall preserve continuity across feed, note view, and chat view.
4. The system shall treat chat as a thinking tool grounded in workspace context.
5. The system shall preserve history, provenance, and reversibility.
6. The system shall add structure gradually through links, tags, tasks, and spaces.

## Success Metrics

- The median time from opening the product to saving a new note or chat shall be under 10 seconds.
- The median time to reopen a recent note or chat from the feed shall be under 3 seconds.
- The system shall preserve full revision history for notes and ordered event history for chats.
- The system shall support trusted AI-assisted read and write actions with reviewable provenance.
- The core loop completion rate shall be tracked as:

$$
CoreLoopRate = \frac{\text{sessions with capture, revisit, and action}}{\text{all active sessions}}
$$

## User Personas And JTBD

| Persona | Functional Goal | Emotional Goal | JTBD |
| --- | --- | --- | --- |
| Independent thinker | Capture ideas, revisit context, and turn notes into plans | Feel mentally clear instead of scattered | When I have fragments of thought, help me save them without structure so I can return later and make progress |
| Context-heavy operator | Keep conversations, tasks, and planning artifacts connected | Feel in control of moving parts | When I am juggling projects and people, help me retrieve the right context fast and convert it into action |
| Collaborative planner | Share selected context with others inside bounded spaces | Feel aligned without oversharing | When I plan with others, help me create a shared working area where notes, tasks, and chat stay coherent |

## Primary User Flow

The critical path shall be:

1. The user opens the product and lands in the unified feed.
2. The composer accepts freeform text or voice immediately.
3. The user captures a thought as a note or starts a chat.
4. The new object appears in the feed instantly.
5. The user later reopens the note or chat from the feed or search.
6. The user asks chat to summarize, connect, or transform the captured context.
7. The system returns grounded output with visible source context.
8. The user accepts a next step such as updating the note, creating a task, or continuing the conversation.

The primary "Aha!" moment is when the user sees that a rough fragment has become reusable memory and actionable context without copy-paste or tool switching.

## Feature Inventory

| Feature Name | User Value | Complexity | Priority |
| --- | --- | --- | --- |
| Unified feed for notes and chats | One home surface for recency and recall | Med | P0 |
| Fast note capture | Reduces friction at idea creation time | Low | P0 |
| Chat grounded in workspace context | Makes AI useful on personal data rather than generic prompts | High | P0 |
| Note version history | Preserves trust and thought evolution | Med | P0 |
| Chat session history | Preserves continuity and revisitability | Med | P0 |
| Full-text search across notes and chats | Enables reliable retrieval | Med | P0 |
| Explicit note attachment into chat | Keeps reasoning grounded in relevant context | Med | P0 |
| Promotion of chat output into structured objects | Converts reasoning into durable memory and action | High | P0 |
| Tags and explicit links | Adds emergent organization without rigid upfront structure | Med | P1 |
| Tasks with status, due date, and historical assignment | Turns notes into execution | Med | P1 |
| Spaces and membership | Enables bounded collaboration | High | P1 |
| Voice capture | Improves mobile capture speed | Med | P1 |
| Calendar and event context import | Adds time-aware reasoning | High | P2 |
| People and place context objects | Enables richer recall and relationship intelligence | High | P2 |
| Proactive suggestions and agent interventions | Surfaces next-best actions | High | P2 |

## Functional Requirements

### Feed

- The system shall present notes and chats in one unified chronology.
- The feed shall order items by most recent meaningful activity.
- The feed shall support fast recognition through title, timestamp, and type.
- The feed shall support cursor-based pagination.

### Notes

- The system shall support fast creation of rough or structured notes.
- The system shall preserve immutable note revision history.
- The system shall let users reopen, edit, archive, restore, and intentionally delete notes.
- The system shall allow notes to be tagged, linked, and placed into spaces.

### Chat

- The system shall support chat as the primary reasoning surface over workspace context.
- The system shall preserve ordered chat history as durable events.
- The system shall allow users to attach notes explicitly to a chat.
- The system shall let users revisit prior chats and continue them later.

### AI Actions

- The system shall support summarize, rewrite, extract action items, and transform-context actions.
- The system shall show the source context used for AI responses when the response affects durable data.
- The system shall require review for consequential structured mutations.
- The system shall preserve provenance for AI-generated updates.

### Search And Retrieval

- The system shall support full-text search across notes and chats.
- The system shall support retrieval scoped to user and space visibility.
- The system shall rank results using relevance, recency, and explicit relationship signals.

### Collaboration

- The system shall support bounded collaboration through spaces.
- The system shall let users invite collaborators and assign roles.
- The system shall ensure that tags and links never grant access on their own.

### Tasks

- The system shall allow notes and chats to produce tasks.
- The system shall support task status, priority, due date, and assignment history.
- The system shall allow tasks to relate to notes, spaces, people, and goals.

## Non-Goals For v1

- The system shall not attempt to replace a full calendar product.
- The system shall not launch as a broad multi-app life-management suite.
- The system shall not optimize for heavyweight project management workflows.
- The system shall not make proactive agent behavior a launch dependency.

## Constraints

- The product narrative shall remain a notes-first workspace, not a generalized Life OS.
- The MVP shall prioritize notes and chats as the only P0 feed objects.
- Structured expansion into tasks, spaces, calendar, people, and places shall occur only if it strengthens the core loop.
