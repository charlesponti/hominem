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

## Listing draft

- Name: Hominem
- Short description: Manage your career profile and job search with ChatGPT.
- Long description: Hominem securely connects ChatGPT to your career profile so
  you can review work history, applications, education, skills, projects,
  testimonials, certifications, and social links, and make explicit updates
  when you ask.
- Category: Productivity
- MCP server URL: `https://api.ponti.io/api/mcp`
- Server type: Universal

## Required URLs

- Website: OPEN — USER DECISION REQUIRED
- Support: OPEN — USER DECISION REQUIRED
- Privacy policy: OPEN — USER DECISION REQUIRED
- Terms: OPEN — USER DECISION REQUIRED

## Publisher requirements

- Verify the Hominem developer or business identity in the OpenAI Platform.
- Ensure the submitting organization has Apps Management write access.
- Configure `OPENAI_APPS_CHALLENGE` in the production API environment with the
  token supplied by the submission portal.
- Confirm `https://api.ponti.io/.well-known/openai-apps-challenge` returns the
  exact token as plain text.

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
