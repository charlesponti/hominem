---
type: submission-readiness
title: Hominem ChatGPT plugin
status: in_progress
---

# Hominem ChatGPT plugin

This is the public-submission checklist for the Hominem MCP-only plugin. The
plugin uses the universal production MCP endpoint:

`https://api.ponti.io/api/mcp`

Users should discover Hominem in the Plugin Directory, choose **Connect**, and
complete Hominem OAuth. They should not configure MCP URLs, client IDs, or
callback URLs themselves.

## Mobile availability

Hominem is being prepared as a reviewed Plugin Directory app. The private
custom MCP app created in ChatGPT Developer Mode is a web-only test harness;
it is not the mobile delivery mechanism. Mobile availability must be verified
after OpenAI approves and publishes the Hominem app, because availability can
vary by app and surface.

The pre-connection verification steps, publisher requirements checklist, and
post-approval mobile test are runbook content — see the
`chatgpt-plugin-submission` skill (`.agents/skills/chatgpt-plugin-submission/`).

This is a tool-only integration, so results appear as normal ChatGPT messages;
there is no custom widget to install.

## Listing draft

- Name: Hominem
- Short description: Your personal data repository for ChatGPT.
- Long description: Hominem securely connects ChatGPT to your personal data
  repository so you can review and explicitly update career, finance, health,
  calendar, travel, media, people, places, collections, tags, and related
  personal records.
- Category: Productivity
- MCP server URL: `https://api.ponti.io/api/mcp`
- Server type: Universal

## Required URLs

- Website: `https://ponti.io`
- Support: `https://api.ponti.io/support`
- Privacy policy: `https://api.ponti.io/privacy`
- Terms: `https://api.ponti.io/terms`

These pages are operational drafts created for the Hominem ChatGPT connection.
Review them with qualified counsel before public launch.

## Authentication

The API exposes OAuth discovery, dynamic registration, PKCE authorization,
refresh tokens, and userinfo at the API origin. The OAuth request should use:

- `openid profile email offline_access`
- `career:read`
- `career:write`

Reviewer credentials are not yet defined. OPEN — USER DECISION REQUIRED:
provide a review-safe account and authentication path that does not require
MFA, SMS, email confirmation, or private-network access.

## Submission test cases

See [test-cases.md](./test-cases.md) for reviewer-ready positive and negative
flows. These require a review-safe authenticated account before submission.

## Current limitations

- MCP-only; no custom ChatGPT widget is included.
- Public directory submission must still be completed in the OpenAI Platform.
- The existing `plugins/hominem-mcp` package is a Claude Code plugin and is not
  the ChatGPT submission artifact.
