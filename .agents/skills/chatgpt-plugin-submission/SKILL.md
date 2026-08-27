---
name: chatgpt-plugin-submission
description: Verify and prepare the Hominem ChatGPT (OpenAI Apps) plugin for public submission — challenge/discovery checks, publisher requirements, and reviewer test cases. Use when working on the OpenAI Apps Plugin Directory submission or debugging its OAuth/MCP discovery endpoints.
---

# Hominem ChatGPT plugin submission

Listing copy, product decisions, and open questions live in
[docs/chatgpt-plugin/README.md](../../../docs/chatgpt-plugin/README.md).
Reviewer test cases live in
[docs/chatgpt-plugin/test-cases.md](../../../docs/chatgpt-plugin/test-cases.md)
— run through them before submission. This skill is the verification runbook.

The plugin is MCP-only, using the universal production endpoint
`https://api.ponti.io/api/mcp`. Users connect via the Plugin Directory and
Hominem OAuth — they never configure MCP URLs, client IDs, or callback URLs
themselves.

## Before connecting / before submission

Set the production API secret `OPENAI_APPS_CHALLENGE` to the exact challenge
value from the OpenAI Apps submission/developer portal, redeploy the API, then
verify:

```bash
curl -fsS https://api.ponti.io/.well-known/openai-apps-challenge
curl -fsS https://api.ponti.io/.well-known/oauth-protected-resource/api/mcp
```

The first must return the challenge as plain text. The second must return the
Hominem MCP resource metadata. Never commit the challenge value.

For private web testing: enable Developer Mode in ChatGPT, create a custom
app, and use MCP URL `https://api.ponti.io/api/mcp`. Review the discovered
tools and complete the Hominem email-OTP login/consent flow.

## Publisher requirements checklist

- Verify the Hominem developer/business identity in the OpenAI Platform.
- Ensure the submitting organization has Apps Management write access.
- `OPENAI_APPS_CHALLENGE` configured in the production API environment with
  the token from the submission portal.
- `https://api.ponti.io/.well-known/openai-apps-challenge` returns the exact
  token as plain text (re-check after every redeploy — a stale secret is a
  silent submission blocker).

OAuth request scope: `openid profile email offline_access career:read career:write`.

## After directory approval

Test Hominem on ChatGPT web, iOS, and Android from the Plugin Directory (not
the Developer Mode test harness). Do not claim mobile support before that test
passes — availability can vary by app and surface.

## Running the reviewer test cases

Walk every case in
[docs/chatgpt-plugin/test-cases.md](../../../docs/chatgpt-plugin/test-cases.md)
against a review-safe authenticated account: positive cases (career
engagements/applications/education/social-link tools, each scoped to the
authenticated user) and negative cases (cross-user access refused, unsupported
external actions explained rather than attempted, unconfirmed destructive
actions blocked). A review-safe account/auth path (no MFA, SMS, email
confirmation, or private-network access) is still an open decision — flag it
if you hit it during a submission pass rather than working around it silently.
