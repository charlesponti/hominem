---
type: project-index
status: proposed
priority: high
team: api
project: career-mcp
labels:
  - career
  - mcp
  - api
  - rpc
---

# Career MCP: full career CRUD from AI tools

This folder decomposes the plan to expose complete career-domain control (engagements, applications, education, skills, projects, testimonials, certifications, social links) through MCP tools so AI clients can fully manage the career profile.

## Delivery order

1. [Repository layer: boolean delete returns + education methods](00-repository-layer.md) — `packages/db` changes that everything else depends on.
2. [Shared Zod schemas](01-schemas.md) — new input schemas for create/update/delete operations.
3. [Service functions](02-service-layer.md) — new `career.service.ts` functions and boolean-propagation fixes.
4. [MCP tools](03-mcp-tools.md) — 22 new tools in `mcp/tools/career.ts`.
5. [RPC routes](04-rpc-routes.md) — new Hono routes in `rpc/routes/career.ts`.
6. [Tests (TDD red first)](05-tests.md) — failing MCP and RPC integration tests written before implementation.
7. [Validation and evidence](06-validation.md) — full validation gates and evidence report.

## Decisions

- Skip `career_profile_update`; profile editing stays web-only.
- Education gets create, update, and delete even though the web app only creates today — explicitly approved by the product owner.
- No new MCP scopes: `career:write` already exists and already gates `./tools/career` in `mcp/routes.ts`.

## Shared scope

- `packages/db/src/services/career/career.repository.ts`
- `packages/db/src/services/career/skill.repository.ts`
- `packages/db/src/services/career/testimonial.repository.ts`
- `packages/db/src/services/career/certification.repository.ts`
- `services/api/src/schemas/career.schema.ts`
- `services/api/src/application/career.service.ts`
- `services/api/src/mcp/tools/career.ts`
- `services/api/src/mcp/tools/career-engagements-projects.test.ts`
- `services/api/src/rpc/routes/career.ts`
- `services/api/src/rpc/routes/career.test.ts`
