---
name: owasp-ai-security
description: OWASP-grounded security review for AI and agentic code. Use for packages/ai, prompt handling, tool use, model integrations, and agent threat modeling.
---

# OWASP AI Security

Use the vendored specialist skills under `skills/` and the standalone procedures under `plays/`.

For Hominem, prioritize:

- `skills/agent-security-audit/SKILL.md` for agent permissions, tool access, and data-exfiltration paths.
- `skills/llm-risk-assess/SKILL.md` for `packages/ai` and model-provider boundaries.
- `skills/prompt-injection-test/SKILL.md` for untrusted prompts and retrieved content.
- `skills/multi-agentic-threat-model/SKILL.md` for trust boundaries and attack trees.

Separate confirmed vulnerabilities, hardening gaps, and deployment-dependent tests. Never include secret values in reports.
