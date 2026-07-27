<!--
  ═══════════════════════════════════════════════════════════════════════
  Sync Impact Report — Constitution v1.0.0
  ═══════════════════════════════════════════════════════════════════════

  Version change:   (template) → 1.0.0
  Bump type:        MAJOR (initial constitution — all principles new)
  Modified principles: none (all sections are new)
  Added sections:
    - Core Principles (I–V)
    - Platform & Environment Standards
    - Development Workflow
    - Governance (versioning policy, amendment procedure, compliance review)
  Removed sections: none
  Templates requiring updates:
    ✅ .specify/templates/plan-template.md (Constitution Check gates updated)
    ✅ .specify/templates/spec-template.md (no changes needed — already aligned)
    ✅ .specify/templates/tasks-template.md (no changes needed — already aligned)
    ✅ .specify/templates/checklist-template.md (no changes needed — generic)
  Follow-up TODOs: none — all placeholders resolved.
  ═══════════════════════════════════════════════════════════════════════
-->

# Hominem Constitution

## Core Principles

### I. Monorepo Boundaries
Apps depend on packages, not the reverse. Default dependency direction:
apps → packages → services/api. Packages MUST be self-contained, independently
testable, and serve a clear shared purpose. No circular dependencies between
packages. Every package MUST justify its existence — a package is not an
organizational dumping ground.

### II. API-First Capability Boundary (NON-NEGOTIABLE)
All product clients (web, mobile, MCP, CLI) share a single authenticated
capability boundary via Hono RPC. Clients MUST NEVER access Postgres, object
storage, or internal repository rows directly. Every route MUST:

- Validate input with runtime schemas
- Resolve identity via Better Auth
- Authorize scope
- Call an application service (not a repository)
- Return stable typed errors

Transport DTOs are mapped from domain/read models, never reused database rows.

### III. Database Discipline
PostgreSQL is the only database engine. Schema changes require a Goose migration
file. After every schema change, run `just db-migrate` to apply migrations and
regenerate Kysely types. The file `packages/db/src/types/database.ts` is
generated — never hand-edit it. The test database (`DATABASE_URL_TEST`) MUST
mirror the local database schema exactly.

### IV. Quality Gates
Linting uses oxlint; `typescript/no-explicit-any` is an **error**, not a warning.
Formatting uses oxfmt (single quotes, imports sorted ascending
case-insensitively). Pre-commit: `pnpm run precommit` (format + lint).
Pre-push: `pnpm run prepush` (full test suite). Prefer `just` recipes over raw
`pnpm` commands for common workflows.

### V. Simplicity & Platform Focus (YAGNI)
Follow YAGNI (You Aren't Gonna Need It). Use the smallest possible loop by
default. One-liner solutions preferred over unnecessary complexity.
Arrow-function shorthand: `() => fn(args)` rather than `() => { return fn(args); }`.
`apps/omiro` is Apple/iOS-only — never add Android platform checks or fallbacks.

## Platform & Environment Standards

- **Runtime**: Node >= 24.14.1 (enforced via `engines` in package.json)
- **Package manager**: pnpm 11.1.1
- **Build orchestration**: Turborepo (`turbo.json` defines all task pipelines)
- **Mobile platform**: Expo managed workflow, iOS only
- **Local infrastructure**: Docker Compose for Postgres, Redis, and supporting services
- **Auth**: Better Auth (passkeys + OTP for web; mobile bearer surface for omiro)
- **Database**: PostgreSQL accessed through Kysely query builder via `@hominem/db`
- **CI model**: Two-layer — canonical checks (Web, API) + confidence lanes (DB Migrations, E2E Web Auth)
- **Telemetry**: OpenTelemetry for traces and logs; Sentry for error reporting

## Development Workflow

- **Branch naming**: `feature/<name>` for feature work
- **PR merging**: squash commit
- **Commits**: Never commit on the user's behalf — leave commits for the user to review and push
- **Database change loop**: schema change → Goose migration → `just db-migrate` → tests pass
- **Mobile UI testing**: Maestro flows — always use `testID` (`id:`) selectors, never tap by text
- **Pre-commit**: `pnpm run precommit` (format + lint)
- **Pre-push**: `pnpm run prepush` (full test suite)
- **Pre-build**: `pnpm run check` (typecheck + lint + build + test)
- **Runtime guidance**: See `AGENTS.md` for agent instructions.

## Governance

This constitution supersedes all other local practices and conventions.
Amendments require:

1. A documented change proposal describing the rationale and impact
2. A version bump according to semantic versioning rules:
   - **MAJOR** — backward-incompatible governance/principle removals or redefinitions
   - **MINOR** — new principle/section added or materially expanded guidance
   - **PATCH** — clarifications, wording refinements, typo fixes
3. All PRs and reviews MUST verify compliance with this constitution before merging
4. Any complexity that violates a principle MUST be documented and justified in
   the relevant plan or spec

**Version**: 1.0.0 | **Ratified**: 2026-07-10 | **Last Amended**: 2026-07-10
