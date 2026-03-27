---
title: Finance
slug: /docs/cortex/schema/finance
status: canonical
owner: product
type: schema
summary: Defines financial institutions, accounts, transactions, and contextual reasoning requirements.
---

# Finance PRD

## Purpose

Define the requirements for financial accounts, transactions, imported ledger data, and contextual financial reasoning.

## Domain Concepts

This domain is user-facing as accounts, transactions, institutions, and money context.

Implementation names such as Plaid items are integration-layer schema objects rather than primary product concepts.

## Current Schema Objects

- `app.finance_institutions`
- `app.plaid_items`
- `app.finance_accounts`
- `app.finance_transactions`

## User Outcomes

Users must be able to:

- connect institutions
- sync accounts and transactions
- preserve source fidelity
- add or correct financial records when needed
- connect spending to notes, people, goals, possessions, spaces, and tags

## Core Requirements

- transactions are first-class facts
- imported provider state must remain traceable
- financial reasoning must support both ledger-like and life-context views
- categories are not the primary organizing system

## Integrity Requirements

- account and provider identifiers must remain unique where appropriate
- balances and amounts must use explicit numeric types
- transaction direction and state must remain queryable

## Access Requirements

- finance remains owner-first and sensitive by default

## Query Requirements

The system must support fast queries for:

- transactions by account and time range
- recent account state
- provider item reconciliation
- transaction lookup by related context
