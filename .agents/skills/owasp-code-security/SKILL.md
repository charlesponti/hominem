---
name: owasp-code-security
description: OWASP-grounded security review for this monorepo. Use for API, web, iOS, dependency, secret, and general code-security audits.
---

# OWASP Code Security

Use the vendored specialist skills under `skills/` and their procedures under `plays/`.

For Hominem, prioritize:

- `skills/api-security-review/SKILL.md` for `services/api`.
- `skills/code-review-security/SKILL.md` for shared packages and web code.
- `skills/sca-audit/SKILL.md` for the pnpm workspace and lockfile.
- `skills/secrets-scan/SKILL.md` for source and Git history.
- `skills/mobile-code-review/SKILL.md` for the Apple-only `apps/omiro` app.

Every finding must include file and line evidence, an attack scenario, impact, confidence, and remediation. Do not report a checklist deviation as a vulnerability without a credible exploit path.
