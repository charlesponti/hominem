# Assets And Inventory PRD

## Purpose

Define the requirements for physical things, where they are, and how they change over time.

## Tables

- `app.possession_containers`
- `app.possessions`
- `app.possession_events`

## User Outcomes

Users must be able to:

- keep records of important possessions
- organize possessions into containers or locations
- track movement, acquisition, disposal, and valuation events
- connect possessions to notes, places, people, goals, and spaces

## Core Requirements

- possessions are durable objects
- possession events are immutable history
- inventory organization should support location and containment without forcing category taxonomies

## Integrity Requirements

- container relationships must remain valid
- event types must remain constrained
- valuation and quantity data must remain explicit and queryable

## Query Requirements

The system must support fast queries for:

- possessions by container or place
- movement history
- current state reconstructed from events plus current object rows
