# II. Architecture

Hominem is a monorepo containing several products and shared packages. They do not all use the same path to reach data.

## How the parts connect

```text
Omiro
  -> RPC client and shared domain packages
  -> API
  -> database and infrastructure

Career browser
  -> Career server routes and services
  -> database and infrastructure

API
  -> authentication authority
  -> authorization context
  -> persistence and orchestration
```

- Omiro must use `@hominem/rpc` to access data.
- Career route's `loaders` and `actions` access the database directly. Browser components should use database-derived TypeScript types, but database handles and queries must stay on the server.
- Most protected RPC and MCP requests use the auth context created by the API's global auth middleware. The middleware resolves identity before route handling, and protected route middleware rejects requests without that context.
- The `/api/auth` routes are an exception. The global auth middleware skips them because they implement session and authentication operations, and those routes call Better Auth directly when they need the current session.
- The API is both a deployable service and the source of several client contracts. It exports `@hominem/api/types`, `@hominem/api/career`, and `@hominem/api/finance`; client packages consume those type contracts without using the API as a runtime dependency.
- Shared package entry points expose the public handles, types, errors, repositories, and helpers that each package supports. `@hominem/db` owns database access, repositories, schemas, and transactions; only server-owned code may import it directly, and client applications must use RPC instead of its runtime exports.
- Type-only imports do not create workspace dependency edges. Use a local TypeScript path alias when a package needs a source contract without a runtime dependency.

Omiro's route ownership and app-specific implementation details are documented in [the Omiro README](../apps/omiro/README.md).

## Data rules

- Validate all external input at runtime. Typed client code must still parse API responses before changing application state.
- Generated database types are checked into the build process. Run `just db codegen` to generate them; CI rejects drift.
- Omiro's database is the source of truth for tasks and their scheduling intent. Apple Calendar and Reminders are device integrations. Their IDs and sync state are projections; they do not replace the task record.
- Career engagements store work history and are typed as employment, contract, freelance, volunteer, or other. Portfolio projects are independent records and may optionally link to multiple engagements through `career_project_engagements`; they are not embedded in work history. Companies a user wants to work for are career applications with status `WISHLIST`; they are not engagements. Application status is a PostgreSQL enum: `WISHLIST`, `APPLIED`, `SCREENING`, `OFFER`, `ACCEPTED`, `REJECTED`, or `WITHDRAWN`. Application stages retain company-specific labels and use the broad kinds `APPLICATION`, `SCREEN`, `OFFER`, and `OUTCOME`; `current_stage_id` points to the active stage-history record.
- All tests must use the test database.

## Open decisions

- **Public transport contract ownership** — Clients no longer depend on the deployable API package for runtime or type ownership.
- **Career data model** — One documented server/DB or API-backed model; database imports stay in its permitted layer.
- **Finance release tier** — README, CI, deployment configuration, and command scopes agree.
- **Better Auth bearer sessions** — Keep or remove the plugin with a tested external compatibility contract.
