# Work And Outcomes PRD

## Purpose

Define the requirements for operational work, assignments, goals, and measurable outcomes.

## Tables

- `app.tasks`
- `app.task_assignments`
- `app.goals`
- `app.key_results`

## User Outcomes

Users must be able to:

- capture work that needs to happen
- assign work over time
- track status and priority
- connect work to people, notes, spaces, events, and goals
- define goals and measurable results

## Core Requirements

- tasks are action objects with explicit state
- task assignments are historical, not just a single assignee column
- goals and key results are strategic objects, not just tags on tasks
- tasks may live in a primary collaboration home while also being included elsewhere through `space_items`

## Integrity Requirements

- task status and priority must be constrained
- assignment windows must be valid
- key results must resolve to a goal

## Query Requirements

The system must support fast queries for:

- active tasks by user
- tasks by due date and status
- tasks by space
- current assignee and assignment history
- goals with child key results
