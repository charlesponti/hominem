---
title: Observability And Audit
slug: /docs/cortex/blueprint/observability-and-audit
status: draft
owner: product
type: blueprint
summary: Defines the boundary between product state, observability events, and audit streams.
---

# Observability And Audit

## Purpose

Define the requirements for observability, forensic auditability, and event-stream clarity across the Cortex system.

## Architectural Role

This document is not a schema domain definition.

Observability and audit event streams are operational architecture concerns. They support reliability, debugging, trust review, and system learning, but they are not part of the user-facing product model unless a specific record is also part of durable application state.

## Storage Boundary

PostgreSQL shall store:

- durable product objects
- immutable history that the application depends on directly
- minimal trust-critical records that are part of canonical product state

ClickHouse shall store:

- request logs
- trace spans
- latency and performance signals
- search event streams
- audit event streams
- agent execution events

## Why This Split Exists

The system needs two different kinds of truth:

1. Product truth: what the application must treat as canonical state
2. Event truth: what operators need to inspect, analyze, and replay at scale

PostgreSQL is optimized for transactional consistency and durable application state.

ClickHouse is optimized for append-heavy event ingestion, forensic analysis, and large-scale operational visibility.

## Required Outcomes

Operators must be able to:

- inspect critical actions across the system
- analyze request and search behavior at scale
- investigate agent and tool activity
- reconstruct incident timelines
- answer who-did-what-when questions for sensitive actions

## Core Requirements

- critical product actions shall emit audit events
- search and retrieval behavior shall emit event streams suitable for analysis
- observability data shall remain operationally separate from tenant-facing product state
- audit emission shall not require duplicating high-volume logs in PostgreSQL
- product logic shall not depend on ClickHouse records being present unless explicitly designed for that dependency

## Examples

Store in PostgreSQL:

- note versions
- chat history
- goal state
- task state
- membership changes if they are part of application truth

Emit to ClickHouse:

- API request logs
- search queries for ranking analysis
- AI mutation approvals and rejections as audit events
- tool execution traces
- background job outcomes

## Access Requirements

- observability and audit streams are service-owned first
- direct customer access to raw event streams is not assumed
- customer-facing trust views should be derived intentionally from the appropriate source of truth
