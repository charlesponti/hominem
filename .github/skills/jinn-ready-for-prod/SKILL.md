---
name: jinn-ready-for-prod
description: Use when validating production readiness before a release, deployment, or launch decision.
license: MIT
compatibility: Works with any project.
metadata:
  author: jinn
  version: "1.0"
  generatedBy: "1.0.0"
  category: Quality
  tags: [quality, production, deployment, readiness]
---

Validate production readiness before a release, deployment, or merge decision.

## Steps

### 1. Identify scope
- Determine what is being validated: a PR, branch, feature, or full release.
- Ask for the associated Linear issue URL if not provided — the verdict will be written back to it.

### 2. Run the readiness checklist

**Code Quality**
- [ ] No `console.log` or debug statements left in production paths
- [ ] No hardcoded secrets, tokens, or environment-specific values in source
- [ ] Error handling is present at all external boundaries (API calls, user input, file I/O)
- [ ] TypeScript types are correct and there are no `any` casts masking real errors

**Testing**
- [ ] Unit tests pass (`bun test` or equivalent)
- [ ] Integration tests pass
- [ ] Manual testing completed for the changed user flows
- [ ] Edge cases and error paths are covered

**Security**
- [ ] All user input is validated and sanitized
- [ ] Authentication and authorization are enforced on all protected routes
- [ ] No OWASP Top 10 issues introduced (injection, XSS, SSRF, broken auth, etc.)
- [ ] Secrets are not in source code or committed files

**Performance**
- [ ] No memory leaks or unbounded resource allocations
- [ ] No N+1 queries or unindexed lookups on hot paths
- [ ] Load tested if the change affects throughput-sensitive paths

**Documentation**
- [ ] README updated if setup or usage changed
- [ ] API docs or changelogs updated for externally visible changes

**Deployment**
- [ ] All required environment variables are configured in the target environment
- [ ] Database migrations are backward-compatible and ready to run
- [ ] A rollback plan is defined and executable
- [ ] Monitoring and alerting cover the changed paths

**Scope completeness**
- [ ] Feature is complete per the Linear issue description and acceptance criteria
- [ ] No known regressions introduced

### 3. Deliver verdict
- **PASS** — all items satisfied; the change is ready to ship.
- **PASS WITH NOTES** — minor items to address post-release; list them explicitly.
- **FAIL** — one or more blocking items; list each with a short description of what must be fixed.

### 4. Write verdict to Linear
If an associated Linear issue was provided:
- Use `mcp_linear_save_comment` to post the verdict and the list of blocking items (or "no blockers").
- If the verdict is FAIL, do **not** transition the issue to Done — leave it In Progress or move it back to Todo.
- If the verdict is PASS, the issue is ready for the next phase; the caller decides whether to merge or deploy.

## Guardrails
- Every checklist item must be explicitly confirmed or explicitly noted as not-applicable — no silent skips.
- A PASS verdict with unresolved security or testing items is never acceptable.
- Verdict must be written to Linear if an issue is associated — the Linear issue is the system of record.
