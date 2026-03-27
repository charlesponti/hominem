---
title: Collaboration And Semantics
slug: /docs/cortex/schema/collaboration-semantics
status: canonical
owner: product
type: schema
summary: Defines spaces, containment, tagging, linking, and cross-entity meaning.
---

# Collaboration And Semantics PRD

## Purpose

Define the requirements for collaboration boundaries, containment, semantic grouping, and cross-entity meaning.

## Domain Concepts

This domain is user-facing as shared spaces, tags, connections, and context.

Implementation names such as entities, space items, space tags, and tag assignments are schema primitives that power those user-facing concepts.

## Current Schema Objects

- `app.entities`
- `app.entity_links`
- `app.spaces`
- `app.space_members`
- `app.space_invites`
- `app.space_items`
- `app.tags`
- `app.space_tags`
- `app.tag_aliases`
- `app.tag_assignments`

## User Outcomes

Users must be able to:

- create shared contexts
- invite collaborators
- place things in one or more spaces
- tag anything important
- reuse tags across spaces
- maintain shared vocabularies inside spaces
- relate things explicitly across domains

## Core Requirements

- `spaces` are collaboration boundaries
- `space_items` are the canonical source of truth for containment
- `tags` are semantic groupings, not access boundaries
- tags must be reusable across many spaces
- `space_tags` curate vocabulary without making tags space-owned
- `entities` provide a universal identity layer for cross-entity operations
- `entity_links` provide explicit semantic relationships

## Integrity Requirements

- active space membership must be unique per `(space_id, entity_table, entity_id)`
- entity references in tag assignments and links must resolve through `app.entities`
- active tag assignment must be unique per `(tag, entity)`
- tag aliases must be unique within a tag
- tag slug and path fields must remain valid and non-empty

## Access Requirements

- space membership and space ownership control collaboration access
- tags must be readable when they are owned or visible through space curation
- tags must never grant access to an entity on their own
- links must never act as a substitute for containment

## Query Requirements

The system must support fast queries for:

- all items in a space
- all spaces containing an entity
- all entities with a tag
- all entities under a hierarchical tag family
- multi-tag intersection queries
- fuzzy tag lookup
- link traversal by relation type
