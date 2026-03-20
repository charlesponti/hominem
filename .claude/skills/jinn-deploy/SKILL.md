---
name: jinn-deploy
description: Use when deploying to any environment — staging, production, or otherwise — or when diagnosing a deployment failure.
license: MIT
compatibility: Works with any project.
metadata:
  author: jinn
  version: "1.0"
  generatedBy: "1.0.0"
  category: Engineering
  tags: [deploy, deployment, rollback, environment]
when:
  - deploying to staging, production, or any other environment
  - diagnosing a deployment failure or regression
  - choosing a deployment strategy for a high-risk change
  - verifying a deployment succeeded
applicability:
  - Use before and during any environment deployment
  - Use when a deployment failed and needs diagnosis or rollback
termination:
  - Pre-deployment checklist passed
  - Deployment completed and post-deployment verification passed
  - Or: rollback completed and root cause identified
outputs:
  - Deployed environment
  - Post-deployment verification report
  - Or: rollback confirmation + root cause
disable-model-invocation: true
---

Deploy to any environment and verify the result.

## Pre-Deployment Checklist

Before touching a deployment:
- [ ] All tests are passing on the target branch.
- [ ] Build succeeds with production configuration.
- [ ] Environment variables are configured; secrets are rotated if changed.
- [ ] Database migrations are prepared and tested as reversible.
- [ ] A rollback plan is documented and understood by whoever is on call.

Do not deploy without passing this checklist. A deploy that skips it doesn't save time — it borrows it.

## Deployment Strategies

| Strategy | When to use | Rollback |
|---|---|---|
| **Blue-Green** | Zero-downtime swap; previous environment stands by | Instant — flip traffic back |
| **Rolling** | Replace instances one-by-one; preserves capacity | Slow — must redeploy previous version |
| **Canary** | Route a small percentage first; catch regressions early | Easy — reduce canary to zero |
| **Feature flags** | Deploy code dark, enable incrementally per user segment | Instant — flip the flag off |

Choose canary or feature flags for high-risk changes. Blue-green for routine releases. Rolling only when capacity constraints prevent anything else.

## Post-Deployment Verification

Immediately after deploying:
1. **Health checks** — confirm all services respond to their health endpoints.
2. **Error rates** — compare against the pre-deploy baseline for at least 10 minutes.
3. **Key user flows** — manually verify: login, the core action, the critical path.
4. **Logs** — scan for unexpected errors or warnings that weren't present before.

## When It Goes Wrong

If error rates spike, health checks fail, or user reports arrive:
1. **Roll back immediately** — do not try to hot-fix a broken production deployment.
2. **Preserve the evidence** — capture logs, traces, and metrics before anything changes.
3. **Diagnose offline** — understand the root cause before re-deploying.
4. **Re-deploy with the fix verified** — run the full pre-deployment checklist again.

The rule: rollback first, fix second. The cost of one more rollback cycle is almost always less than the cost of a botched hot-fix.

## Environment Parity

Production bugs that don't reproduce in staging usually mean the environments diverged:
- Are the environment variables identical (modulo secrets)?
- Are the dependency versions identical (check lockfiles)?
- Are the infrastructure configurations the same (replica count, memory limits, etc.)?
- Is the seed data representative of production volume and shape?

Treat environment divergence as a bug. Fix parity before the next release.

## Guardrails
- Never deploy without passing the pre-deployment checklist.
- Rollback first, fix second — always.
- Never hot-fix a broken production deployment; roll back and fix offline.
