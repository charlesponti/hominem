# People, Places, Time, And Journeys PRD

## Purpose

Define the requirements for relationship intelligence, spatial context, imported commitments, and journey-like planning objects.

## Tables

- `app.people`
- `app.places`
- `app.bookmarks`
- `app.calendar_events`
- `app.calendar_attendees`
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
- calendar events are a lightweight sync and context layer, not a full calendar-product replacement
- the current trip table exists to support time-bounded travel contexts, but the long-term abstraction remains open

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
