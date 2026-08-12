---
type: task
id: CAREER-MCP-06
title: Validation and evidence
status: pending
priority: high
team: api
project: career-mcp
labels:
  - validation
  - evidence
estimate: S
assignee: unassigned
depends_on:
  - CAREER-MCP-05
blocks: []
---

# Validation and evidence

## Objective

Prove every changed behavior in the environment where it matters, per `docs/evidence.md`. API/RPC changes are proven by targeted integration tests against the real `app-test` database.

## Validation gates

Run in order from `services/api` and the repo root:

1. Targeted tests (green): `pnpm exec vitest run src/mcp src/rpc/routes/career.test.ts`.
2. Full MCP surface: `pnpm exec vitest run src/mcp`.
3. API typecheck: `pnpm --filter @hominem/api typecheck`.
4. db build + typecheck: `pnpm --filter @hominem/db build` then `pnpm --filter @hominem/db... exec tsc --noEmit`.
5. `apps/career` typecheck: `pnpm --filter @hominem/career exec tsc --noEmit` (clear `.cache/tsconfig.tsbuildinfo` if the stale cache trips on the db build change).
6. Lint: `pnpm --filter @hominem/api lint`.
7. Format: `pnpm exec oxfmt <changed files> --write` (single quotes, sorted imports), then `pnpm format`.
8. Full pre-push: `just check` before opening a PR.

## Evidence report

When complete, report using the `docs/evidence.md` completion structure:

```markdown
## Validation

- Scope: career MCP tools + RPC routes (22 tools, 7 routes, repo + service + schema changes)
- Command or flow: `pnpm exec vitest run src/mcp src/rpc/routes/career.test.ts`
- Environment: local `app-test` Postgres
- Observed result: <test counts, all green>
- Artifacts: <test files, diff>
- Unverified: <anything remaining>
```

## Acceptance criteria

- All gates pass on the final state.
- Each new tool and route has a passing integration test asserting its contract.
- Cross-owner isolation is covered for every mutating tool and route.
- Evidence names the command, environment, observed result, and any unverified items.
