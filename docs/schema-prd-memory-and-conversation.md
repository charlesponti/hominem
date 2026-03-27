# Memory And Conversation PRD

## Purpose

Define the requirements for durable thought, memory, and conversational reasoning.

## Tables

- `app.notes`
- `app.note_versions`
- `app.note_shares`
- `app.chats`
- `app.chat_messages`

## User Outcomes

Users must be able to:

- capture notes of many shapes
- revise notes without losing history
- see the evolution of an idea
- share notes intentionally
- search and relate notes across the system
- use chat as the primary interface for reading and writing structured data
- revisit past chat sessions
- promote useful chat content into durable structured objects

## Core Requirements

- notes are durable memory objects
- note revisions are immutable historical records
- chats are reasoning sessions, not replacements for notes
- chat messages are event history, not just transcript rows

## Integrity Requirements

- a note head must reference a version belonging to that note
- note revision ordering must be explicit
- revision authorship must be preserved
- share permissions must be constrained
- chat message parentage must stay inside one chat
- chat lifecycle fields like `archived_at` and `last_message_at` must remain trustworthy

## Access Requirements

- notes may be private, directly shared, or visible through shared space context
- chats may be private or shared through collaboration context
- message visibility must derive from chat visibility

## Query Requirements

The system must support fast queries for:

- latest note per user
- note history by note id
- full-text note search
- recent chats
- messages in order within a chat
- note and chat retrieval scoped to a space
