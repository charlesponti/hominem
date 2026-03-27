---
title: Goals And Commitments
slug: /docs/cortex/schema/goals-commitments
status: canonical
owner: product
type: schema
summary: Defines goals, key results, tasks, and commitment-tracking requirements across life domains.
---

# Goals And Commitments PRD

## Purpose

Define the requirements for goals, key results, tasks, and human commitments across the full scope of life.

## Domain Concepts

This domain is user-facing as goals, progress, and commitments.

Implementation names such as tasks, task assignments, goals, and key results are the current backing model. The product language should remain broader than any one planning framework.

## Current Schema Objects

- `app.tasks`
- `app.task_assignments`
- `app.goals`
- `app.key_results`

## User Outcomes

Users must be able to:

- capture commitments that need to happen
- assign commitments over time
- track status and priority
- connect commitments to people, notes, spaces, events, and goals
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
