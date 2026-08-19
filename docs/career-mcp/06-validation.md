---
type: task
id: CAREER-MCP-06
title: Validation and evidence
status: done
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

## Evidence (2026-08-18)

Repository, schema, service, MCP tool, and RPC route implementation (CAREER-MCP-00 through
CAREER-MCP-04) was already complete in the working tree when this pass started. The remaining
gap was test coverage (CAREER-MCP-05): `career-engagements-projects.test.ts` only covered
engagement/project update+delete, and `rpc/routes/career.test.ts` had no coverage for the new
`applications/create|update|delete`, `education/create|update|delete`, or `engagements/create`
routes, and no MCP coverage for any of the 22 new write tools beyond engagement/project
update+delete.

- Scope: career MCP tools + RPC routes (22 tools, 7 routes, repo + service + schema changes)
- Command or flow:
  1. `pnpm exec vitest run src/mcp/tools/career-crud.test.ts src/rpc/routes/career.test.ts` (targeted)
  2. `pnpm exec vitest run src/mcp` (full MCP surface)
  3. `pnpm exec tsc --noEmit` (services/api)
  4. `pnpm --filter @hominem/db build && pnpm --filter @hominem/db... exec tsc --noEmit`
  5. `pnpm --filter @hominem/career exec tsc --noEmit` (cleared `.cache/tsconfig.tsbuildinfo` first)
  6. `pnpm lint` (services/api, oxlint)
  7. `pnpm exec oxfmt <changed files> --write`
- Environment: local `app-test` Postgres (real DB, no mocks, per `packages/db/AGENTS.md`)
- Observed result:
  - Targeted: 2 files, 37 tests passed.
  - Full MCP surface: 14 files, 77 tests passed.
  - `tsc --noEmit`: clean except one pre-existing, unrelated warning in `src/server.ts` (unused
    `DEV_OPENAPI_SERVER`, not touched by this work, present before this pass).
  - `oxlint`: same single pre-existing warning, no new lint issues.
  - `@hominem/db` build + typecheck: clean.
  - `@hominem/career` typecheck: clean.
- Artifacts: new `services/api/src/mcp/tools/career-crud.test.ts`; extended
  `services/api/src/rpc/routes/career.test.ts` (engagement create, application
  create/update/delete, education create/update/delete, each with a cross-owner 404 case).
- Bug found and fixed by this test pass: `createCareerApplication` inserted the caller's raw
  input with no `status` default. `app.career_applications.status` is `NOT NULL` with no column
  default (added by `20260810150000_normalize_career_application_pipeline.sql`), and a
  constraint trigger on that same migration rejects any status other than `WISHLIST`,
  `ACCEPTED`, `REJECTED`, or `WITHDRAWN` unless the application has a matching active pipeline
  stage. Every application create through the API/MCP surface (no stage created alongside it)
  was one `pnpm exec vitest` run away from a 500 the first time a caller omitted `status`. Fixed
  in `services/api/src/application/career.service.ts` by defaulting to `status: 'WISHLIST'` —
  the one exempt status a stage-less create can safely land in — when the caller doesn't supply
  one.
- Unverified: `just check` (full pre-push gate) was not run in this pass — the targeted gates
  above cover every file this change touched. No UI/browser verification — this is an API/MCP
  surface with no frontend component in scope.
