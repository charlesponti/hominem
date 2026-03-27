# Life OS User Capabilities

## Purpose

Define what a user should be able to do in the Life OS, independent of the current table layout.

This document is the product-level source of truth for database scope. The schema should exist to support these capabilities cleanly, durably, and queryably.

## Core Promise

The user should be able to manage their life through one intelligent interface without losing structure, history, context, portability, or control.

That means the system must support:

- long-lived memory
- cross-domain reasoning
- natural-language read and write
- rich visual interfaces generated from structured data
- multi-user collaboration where it matters
- full provenance and exportability

## Design Principles

1. The user should enter information once and reuse it everywhere.
2. The user should not need to decide which app a fact belongs to before capturing it.
3. The system should preserve both structure and history.
4. The system should support both user-authored truth and imported truth.
5. The system should make relationships between things explicit.
6. The system should distinguish organization, access, provenance, and behavior.
7. The user should always be able to export their data in a meaningful form.
8. The user should be able to personalize the presentation of important objects.

## Naming Model

- `tags` are for flexible cross-domain organization
- `spaces` are collaborative context boundaries
- `collections` are grouped sets of things
- ordered collections should be modeled explicitly when order matters

This means:

- a playlist is a collection with order
- a shared planning area is a space
- a tag is never an access-control boundary

## Universal User Actions

Across all domains, the user should be able to:

- create something
- edit it
- archive it
- restore it
- delete it intentionally
- tag it
- place it in one or more collaborative containers
- relate it to other things
- attach notes, links, media, or metadata
- customize visual identity where it helps recognition and recall
- see its history
- see where it came from
- see who can access it
- ask the AI about it in natural language
- have the AI update it safely
- export it

## Identity And Workspace

The user should be able to:

- create an account
- authenticate with email, OAuth, passkeys, and device flows
- manage active sessions and revoke them
- connect external providers
- see what integrations are connected
- control what the agent can access and act on
- invite other people into shared spaces
- audit important account and agent actions

## Notes, Memory, And Thought

The user should be able to:

- capture quick notes, long-form notes, journal entries, scratch thoughts, and structured records
- revise notes over time without losing previous versions
- see the evolution of a thought
- ask the AI to summarize, rewrite, extract action items, or connect ideas
- mention people, places, tasks, goals, trips, possessions, media, and other notes inside a note
- view notes as documents and as memory objects in a graph
- share notes directly or through collaborative containers
- search notes by full text, tags, relationships, recency, and importance

## Chat And Agent Interaction

The user should be able to:

- interact with the Life OS primarily through chat
- use chat to read and write structured data
- see the system render dynamic UI from the underlying model
- inspect what the AI did
- approve, reject, or revise suggested changes
- revisit prior conversations as part of durable memory
- promote useful chat content into structured objects like notes, tasks, people, or trips
- merge chats together

## People And Relationship Intelligence

The user should be able to:

- maintain a person record for anyone relevant in their life
- store names, handles, contact methods, context, and notes
- relate people to notes, events, tasks, spaces, places, and goals
- record important relationship facts over time
- track the last interaction, next follow-up, and strength of connection
- ask questions like:
  - who have I not talked to in a while
  - what do I know about this person
  - what open commitments involve them

## Spaces And Collaboration

The user should be able to:

- create collaborative spaces
- invite others into a space
- grant space-level access without sharing their whole account
- use a space to gather notes, tasks, people, places, media, and plans around a shared context
- let spaces carry shared vocabulary and meaning through tags and links
- ask the AI questions scoped to a space
- see what changed in a space over time
- customize a space with visual identity like color and icon

Spaces are collaboration and context boundaries, not just task buckets.

The user should also be able to:

- create collections inside or across spaces
- save things into curated collections
- keep ordered collections where order matters

Examples:

- playlists are ordered collections
- favorites are collections
- a shared wedding planning area is a space

## Tags, Links, And Meaning

The user should be able to:

- create custom tags
- apply tags to any first-class thing
- use tags for personal organization across domains
- customize tags with visual identity like color and icon
- create explicit links between things
- see why things are connected
- distinguish system-inferred links from user-authored links
- ask semantic questions like:
  - show me everything related to Japan
  - what notes, tasks, and purchases connect to the wedding
  - which people are associated with this goal

## Tasks, Goals, And Outcomes

The user should be able to:

- create tasks with status, priority, due dates, and ownership
- assign tasks to self or collaborators over time
- attach tasks to spaces, people, notes, goals, and calendar events
- define goals and key results
- link tasks to goals they advance
- ask the AI to create plans, break down work, and detect risk
- see both operational work and strategic outcomes in the same system

## Calendar, Time, And Commitments

The user should be able to:

- store events and commitments
- associate events with places and people
- view attendees and response states
- connect calendar items to tasks, trips, notes, and spaces
- ask time-aware questions like:
  - what do I need to prepare for this week
  - which goals are at risk given my calendar
  - what happened around this date

## Travel

The user should be able to:

- create trips
- connect trips to people, places, tasks, notes, bookmarks, and expenses
- store travel details from external providers when needed
- ask the AI for trip-centric views like:
  - show me everything for Tokyo
  - what still needs to be booked
  - what costs are associated with this trip

Travel detail should support both lightweight planning and richer imported booking data.

## Places And Spatial Context

The user should be able to:

- store places that matter
- bookmark places
- link places to people, trips, events, possessions, and notes
- preserve source/provider metadata for imported places
- ask place-based questions like:
  - where did I meet this person
  - which places matter for this trip
  - what do I have stored at this location

## Finance

The user should be able to:

- connect financial institutions
- sync accounts and transactions
- preserve imported source data and reconciliation state
- manually add financial facts when needed
- tag and relate transactions to trips, goals, people, notes, and possessions
- ask questions like:
  - what did this trip cost me
  - what spending is associated with this project
  - what changed financially this month

The model should support finances as both ledger-like records and life-context objects.

## Media, Taste, And Culture

The user should be able to:

- store artists, albums, tracks, playlists, channels, and viewed content
- follow artists and creators
- favorite albums, tracks, videos, and channels
- record listening and viewing history over time
- keep curated collections and ordered playlists
- connect media objects to moods, places, people, notes, trips, and spaces
- ask questions like:
  - what have I been listening to lately
  - what artists do I follow
  - what albums are favorites for this trip
  - what videos should I revisit for this project

This means the schema must support both catalog objects and user-to-catalog relationships. Catalog tables are not optional if the product wants persistent taste, follows, favorites, and collections.

## Personalization And Visual Identity

The user should be able to:

- choose colors and icons for important objects
- make spaces easier to recognize at a glance
- make tags easier to recognize at a glance
- give semantic objects a visual identity that survives across chat and dynamic UI
- keep those presentation preferences as part of their owned data

Personalization should be treated as product data, not just transient UI state.

## Possessions, Assets, And Inventory

The user should be able to:

- store possessions and containers
- track where things are
- record lifecycle and valuation events
- relate possessions to places, people, trips, and goals
- ask questions like:
  - where is this item
  - what do I own for this hobby
  - what should I bring on this trip

## Search, Discovery, And Recall

The user should be able to:

- search across all domains from one interface
- filter by time, type, tag, space, person, place, and source
- pivot from one thing to everything related to it
- recover forgotten information through semantic and structured queries
- get dense visual summaries rather than only text results

## Agentic And Proactive Behavior

The user should be able to:

- receive reminders and follow-up suggestions
- get proactive warnings when goals drift or relationships go cold
- have the AI propose plans, group related information, and surface missing context
- inspect every agent action
- see what observations or recommendations were generated from what evidence
- approve automated changes where trust boundaries require it

## Import, Sync, And Provenance

The user should be able to:

- connect external sources
- import data without losing source identity
- resync safely
- distinguish imported data from user-authored data
- see whether a record was edited after import
- recover the raw source object if needed
- deduplicate intelligently across imports

This requires a first-class provenance model, not just loose `source` columns.

## Privacy, Access, And Agency

The user should be able to:

- know who can access each thing
- share intentionally at the note, space, or collaboration level
- revoke access
- inspect important changes
- export their data in a structured form
- leave the product without losing meaning

## Required Database Capabilities

To support all of the above, the database must support:

- first-class entities
- first-class events
- first-class links between entities
- first-class collaborative containers
- first-class tags
- first-class provenance and sync objects
- strong temporal modeling
- durable version history
- rich search indexes
- explicit access-control boundaries
- catalog objects plus user-to-catalog relationships

## Canonical Data Primitives

The schema should be organized around these primitives:

### Entities

Long-lived objects with identity.

Examples:

- note
- person
- space
- task
- goal
- place
- trip
- possession
- finance account
- finance transaction
- music artist
- music album
- music track
- music playlist
- video channel

### Events

Immutable facts over time.

Examples:

- note version created
- task assigned
- task status changed
- money spent
- track listened to
- video watched
- possession moved
- reminder fired
- agent action executed

### Links

Explicit semantic relations between entities.

Examples:

- note about person
- task advances goal
- trip visits place
- transaction funds trip
- possession located at place
- album associated with mood tag

### Containers

Collaborative and contextual boundaries.

Examples:

- space
- shared planning area
- private collection

### Sources

External provenance and sync state.

Examples:

- connected Spotify account
- synced Plaid item
- imported calendar event
- mirrored place record

## Schema Implications

The schema should not force everything into bespoke vertical tables, but it also should not flatten everything into one generic blob.

The right balance is:

- domain tables for important object types
- graph edges for cross-domain meaning
- event tables for history and analytics
- source tables for import and sync
- user relationship tables for follows, favorites, saves, and memberships

For media specifically, this means:

- keep catalog tables
- add user relationship tables for follow, favorite, save, and collection membership
- keep activity tables for listening and viewing history

For the broader Life OS, this means:

- keep first-class domain objects where users care about identity
- avoid redundant taxonomy tables where tags are enough
- use links instead of proliferating many narrow join concepts

## Questions This Doc Should Answer

Before adding or removing a table, ask:

1. What user capability does this enable
2. Is this a first-class entity, an event, a link, a container, or a source object
3. Does the user care about its identity over time
4. Does the user need to query it directly
5. Does the AI need to reason across it with other domains
6. Is this behavior better modeled as a relation than as a new table
7. Can this be exported in a way that still makes sense to the user

## Recommendation

Use this document as the capability contract for future schema work.

The database should optimize for:

- expressive cross-domain queries
- durable long-term memory
- clear provenance
- collaborative space boundaries
- agent-readable and agent-writable structure
- rich catalog plus relationship modeling where taste, follows, and collections matter
