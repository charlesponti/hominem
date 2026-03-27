# Ops And Agency PRD

## Purpose

Define the requirements for telemetry, auditability, and future proactive agent behavior.

## Tables

- `ops.audit_logs`
- `ops.search_logs`

## User Outcomes

Users must be able to:

- trust the system
- benefit from proactive intelligence over time

Operators must be able to:

- audit critical actions
- inspect system behavior
- understand search and usage patterns

## Core Requirements

- auditability must exist for important actions
- search history must support pattern learning and future proactive features
- operational data must stay clearly separate from tenant-facing product data

## Access Requirements

- ops data is service-only by default

## Query Requirements

The system must support fast queries for:

- audit timelines
- actor and action lookup
- search-pattern analysis
- future agent-review and intervention analysis
