# Implementation Plan: Remove Explicit Any Usage

**Branch**: `001-remove-any-types` | **Date**: 2026-02-17 | **Spec**: /Users/charlesponti/Developer/hominem/specs/001-remove-any-types/spec.md  
**Input**: Feature specification from `/Users/charlesponti/Developer/hominem/specs/001-remove-any-types/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Remove all explicit `any` and `as any` usage across the monorepo by replacing them with schema-derived types, explicit contracts, and type guards, while preserving runtime behavior and enforcing no-explicit-any rules.

## Technical Context

**Language/Version**: TypeScript 5.9.3  
**Primary Dependencies**: React 19, React Router 7, Hono, Zod 4, Drizzle ORM, TanStack Query (via `useHonoQuery`), Vitest  
**Storage**: PostgreSQL (Drizzle ORM)  
**Testing**: Vitest (with React Testing Library)  
**Target Platform**: Web apps + server services (Bun/Node runtime)  
**Project Type**: Monorepo (apps, packages, services, tools)  
**Performance Goals**: N/A (type-safety refactor only)  
**Constraints**: Preserve runtime behavior; no direct DB access in apps; single source of truth for types (DB schema → services → routes → clients)  
**Scale/Scope**: Monorepo-wide refactor across apps, packages, services, and tools

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Gates:
- Strict Typing (no `any`/`unknown`)
- Single Source of Truth for Types
- Validation First (Zod)
- Clean Architecture Boundaries (no DB access in apps)
- Security by Default
- Quality Gates: typecheck, lint, test, validate-db-imports

## Project Structure

### Documentation (this feature)

```text
/Users/charlesponti/Developer/hominem/specs/001-remove-any-types/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
/Users/charlesponti/Developer/hominem/apps/
├── finance/
├── notes/
└── rocco/

/Users/charlesponti/Developer/hominem/packages/
├── ai/
├── auth/
├── career/
├── chat/
├── db/
├── env/
├── events/
├── finance/
├── health/
├── hono-client/
├── hono-rpc/
├── invites/
├── jobs/
├── lists/
├── notes/
├── places/
├── services/
├── ui/
└── utils/

/Users/charlesponti/Developer/hominem/services/
├── api/
└── workers/

/Users/charlesponti/Developer/hominem/tools/
└── cli/

/Users/charlesponti/Developer/hominem/scripts/
```

**Structure Decision**: Monorepo structure with applications under `apps/`, shared libraries under `packages/`, backend services under `services/`, and developer tooling under `tools/`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |
