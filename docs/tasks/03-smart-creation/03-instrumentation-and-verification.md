---
type: task
id: SMART-CREATE-03
title: Measure overrides and verify smart creation
status: ready
priority: medium
team: omiro
project: smart-creation-defaults
labels:
  - analytics
  - qa
  - maestro
estimate: M
assignee: unassigned
depends_on:
  - SMART-CREATE-02
---

# Measure overrides and verify smart creation

## Instrumentation

Emit the approved PostHog event only after the user selects a kind or a creation succeeds. Include draft length bucket, has-line-breaks, inferred kind, selected kind, and whether selected differs from inferred. Never include draft text.

## Verification

Add unit coverage for the classifier and component/Maestro coverage for label updates, default submit, override expansion, accessible override, pending, failure, retry, and success. Verify the control on the smallest supported iPhone with the keyboard visible.

## Acceptance criteria

- Override rate can be calculated without collecting content.
- Short interrogative drafts default to chat and long declarative drafts default to note.
- The submit control remains stable while its label changes.
- No Tier 2 API request exists in this release.
- The resulting item appears in the merged inbox with the correct kind indicator.
