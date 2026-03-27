---
title: Auth And Identity
slug: /docs/cortex/schema/auth-identity
status: canonical
owner: product
type: schema
summary: Defines the identity, authentication, session, and credential requirements.
---

# Auth And Identity PRD

## Purpose

Define the requirements for the authentication and identity layer.

## Domain Concepts

This domain is user-facing as identity, sign-in, trust, and access control.

Implementation names such as sessions, identities, passkeys, and API keys are backing schema objects, not the product vocabulary the user needs to see.

## Current Schema Objects

- `auth.users`
- `auth.identities`
- `auth.sessions`
- `auth.refresh_tokens`
- `auth.passkeys`
- `auth.verification_tokens`
- `auth.device_codes`
- `auth.api_keys`

## User Outcomes

Users must be able to:

- create an account
- sign in with email, OAuth, passkeys, and device flows
- manage active sessions
- revoke compromised sessions
- verify accounts and actions
- connect external identity providers
- create and revoke API keys

## Core Requirements

- there must be one canonical user record
- there must be one canonical session model
- credentials must be attachable and revocable without duplicating account identity
- session state must support stepped-up auth and multiple auth methods
- token-like secrets must be stored as hashes or encrypted values, never plain text

## Integrity Requirements

- email uniqueness must be case-insensitive
- provider subject identity must be unique
- session token hashes must be unique
- refresh token hashes must be unique
- passkey credential ids must be unique
- device codes and user codes must be unique

## Access Requirements

- auth tables are service-owned first
- self-read and narrow self-update are allowed only where explicitly needed
- auth internals must not leak through app-level sharing

## Query Requirements

The system must support fast queries for:

- session lookup by token hash
- user lookup by email
- identity lookup by provider subject
- passkey lookup by credential id
- revocation and active-session dashboards
