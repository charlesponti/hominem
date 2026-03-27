---
title: People, Places, Time, And Journeys
slug: /docs/cortex/schema/people-places-time-journeys
status: canonical
owner: product
type: schema
summary: Defines relationship, spatial, temporal, and journey-context requirements.
---

# People, Places, Time, And Journeys PRD

## Purpose

Define the requirements for relationship intelligence, spatial context, imported commitments, and journey-like planning objects.

## Domain Concepts

This domain is user-facing as people, places, commitments, time context, and journeys.

Implementation names such as attendees and travel trips are current schema objects, not final product-language commitments.

## Current Schema Objects

- `app.people`
- `app.places`
- `app.bookmarks`
- `app.events`
- `app.event_attendees`
- `app.travel_trips`

## User Outcomes

Users must be able to:

- maintain records for important people
- connect people to work, notes, events, and places
- store places that matter
- bookmark useful places and links
- reason over imported calendar commitments
- group life artifacts around trip-like or journey-like contexts

## Core Requirements

- people are durable relationship objects
- places are durable spatial objects with provider provenance
- bookmarks are reusable context objects
- events are a lightweight sync and context layer, not a full calendar-product replacement
- the current trip table exists to support time-bounded travel contexts, but the long-term abstraction remains open

## Calendar Product Role

The calendar layer exists to give the workspace time context, not to replace a dedicated calendar product.

Its job is to:

- import and store commitments
- provide temporal context for the rest of the workspace
- connect time-bound items to people, places, tasks, trips, notes, goals, and spaces
- support planning, recall, preparation, and follow-up

The product should use calendars primarily as a context and reasoning surface.

This means the system should be able to:

- ingest meetings, appointments, and schedule blocks from external sources
- preserve enough source metadata to support sync and reconciliation
- show event details with time, attendees, place, and related workspace context
- answer date- and time-aware questions
- help the user prepare for upcoming commitments
- help the user review what happened around a date or trip
- detect conflicts, overload, and risk against tasks and goals

The first-class product object is the event or commitment, not the calendar container itself.

If a calendar container exists, it should mainly represent import provenance such as:

- source account
- source feed
- external calendar identity

## Calendar Features

The product should provide:

- event import and sync
- event detail views with attendees, place, time, and linked context
- calendar range queries for day, week, and broader windows
- attendee visibility and response-state tracking
- prep and follow-up support around commitments
- conflict and goal-risk reasoning based on calendar load
- timeline context around specific dates
- trip-aware grouping of relevant events
- space-aware visibility for shared commitments

## Calendar Non-Goals

At this stage, the product should not try to be a full calendar replacement.

That means calendar support does not need to optimize for:

- rich calendar authoring as a primary workflow
- complex recurrence editing
- advanced organizer workflows
- heavyweight calendar administration
- broad collaborative editing of imported calendar facts

## Modeling Guidance

The model should distinguish between the source of calendar data and the commitment the user reasons over.

A useful framing is:

- calendar = source, feed, or account provenance
- event = the first-class commitment object
- attendee = relationship context on an event

This implies:

- imported calendar facts should remain lightly editable or read-mostly by default
- event records should be linkable to tasks, notes, trips, spaces, people, and places
- the schema should favor fast range queries, attendee lookups, and contextual joins over full calendar-authoring complexity

## Integrity Requirements

- place coordinates and ratings must stay in valid ranges
- event timing must be valid
- attendee states and roles must be constrained
- trip date windows must be valid

## Access Requirements

- people, places, and bookmarks may become visible through explicit space containment
- imported calendar facts should not automatically become broadly editable by collaborators

## Query Requirements

The system must support fast queries for:

- recent people and places
- place search by text
- calendar range queries
- attendee lookups per event
- all objects related to a place or person
