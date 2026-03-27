# Schema Bible

## Purpose

This is the canonical product requirements entry point for the Life OS database.

It defines:

- the permanent design principles for the schema
- the core primitives the platform is built on
- the domain classes of tables the team maintains
- the authoritative PRD documents for each class

This document should be the first stop before adding, removing, renaming, or restructuring tables.

## Core Promise

The database must support a system where users can manage life through one intelligent interface without losing:

- structure
- history
- context
- collaboration
- provenance
- portability

## Design Principles

1. The schema must model the user’s life, not a bundle of separate apps.
2. The schema must preserve durable facts and histories, not just current snapshots.
3. The schema must distinguish semantics, containment, access, provenance, and behavior.
4. The schema must favor strong constraints over convention.
5. The schema must support both personal use and multi-user collaboration.
6. The schema must let AI act on durable structured data instead of raw chat logs alone.
7. The schema must support high-performance query patterns for search, grouping, timeline reconstruction, and graph traversal.
8. The schema must treat personalization as product data when it helps recognition and recall.

## Canonical Primitives

### Entities

First-class objects with durable identity.

### Events

Time-based facts that should be preserved as history.

### Spaces

Collaborative context boundaries.

### Tags

Cross-domain semantic grouping.

### Links

Explicit semantic relationships between entities.

### Provenance

Imported data, sync state, source mappings, and user-edited-versus-imported distinctions.

## Domain Classes

1. [Auth And Identity PRD](/Users/charlesponti/Developer/hominem/docs/schema-prd-auth-and-identity.md)
2. [Memory And Conversation PRD](/Users/charlesponti/Developer/hominem/docs/schema-prd-memory-and-conversation.md)
3. [Collaboration And Semantics PRD](/Users/charlesponti/Developer/hominem/docs/schema-prd-collaboration-and-semantics.md)
4. [People, Places, Time, And Journeys PRD](/Users/charlesponti/Developer/hominem/docs/schema-prd-people-places-time-and-journeys.md)
5. [Work And Outcomes PRD](/Users/charlesponti/Developer/hominem/docs/schema-prd-work-and-outcomes.md)
6. [Finance PRD](/Users/charlesponti/Developer/hominem/docs/schema-prd-finance.md)
7. [Media And Taste PRD](/Users/charlesponti/Developer/hominem/docs/schema-prd-media-and-taste.md)
8. [Assets And Inventory PRD](/Users/charlesponti/Developer/hominem/docs/schema-prd-assets-and-inventory.md)
9. [Ops And Agency PRD](/Users/charlesponti/Developer/hominem/docs/schema-prd-ops-and-agency.md)

## Cross-Cutting Requirements

Every domain class must state:

- what user outcomes it enables
- which tables belong to it
- which fields are behavior-driving and must remain explicit
- which relationships are strict
- which histories must be preserved
- how access works
- what queries must remain fast
- what imported provenance must be preserved
- what is intentionally out of scope

## Performance Requirements

The schema must optimize for:

- low-friction inserts
- predictable point lookups
- fast cross-entity semantic grouping through tags
- explicit collaboration queries through spaces
- event history queries by time range
- fuzzy lookup where humans search by imperfect names
- hierarchical grouping when tag families are used
- derived read models only where they materially improve performance

## What This Bible Replaces

This PRD set supersedes using exploratory review docs as the main source of truth.

Exploration docs still matter, but they now serve as supporting rationale rather than canonical requirements.
