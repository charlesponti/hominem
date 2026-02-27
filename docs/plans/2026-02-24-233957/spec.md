# Feature Specification: Remove Explicit Any Usage

**Feature Branch**: `001-remove-any-types`  
**Created**: 2026-02-17  
**Status**: Draft  
**Input**: User description: "We must create a plan to remove all `as any` and `any` from the entire monorepo. The repo should use strict typing"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Strictly Typed Codebase (Priority: P1)

As a maintainer, I want the codebase to compile and run without any explicit `any` or `as any` usage so that type safety is enforced across the monorepo.

**Why this priority**: This is the primary objective and foundational to all other improvements.

**Independent Test**: A repo-wide search for `any` and `as any` returns zero matches, and `bun run typecheck` passes.

**Acceptance Scenarios**:

1. **Given** the repository on the feature branch, **When** I search for `as any`, **Then** there are no occurrences.
2. **Given** the repository on the feature branch, **When** I search for the `any` type, **Then** there are no occurrences.
3. **Given** the repository on the feature branch, **When** I run `bun run typecheck`, **Then** it completes without errors.

---

### User Story 2 - Typed API and UI Data Flow (Priority: P2)

As a developer, I want API responses and UI data flows to use explicit, shared types so that type safety is maintained end-to-end.

**Why this priority**: Replacing `any` should improve clarity, not just remove types.

**Independent Test**: Key API clients and hooks use named, exported types and Zod-validated parsing where appropriate.

**Acceptance Scenarios**:

1. **Given** an API hook, **When** I inspect its response type, **Then** it uses a named type from the API contracts or schema-derived types.
2. **Given** a UI component that previously used `any`, **When** I inspect its props and mapped data, **Then** types are explicit and defined in shared modules.

---

### User Story 3 - Test Suite Compatibility (Priority: P3)

As a developer, I want tests to remain valid without `any` usage so that the type system is consistent across test code as well.

**Why this priority**: Tests should be held to the same quality standard as production code.

**Independent Test**: Test files compile under TypeScript without `any` and still pass when executed.

**Acceptance Scenarios**:

1. **Given** a test file that previously used `any`, **When** I run `bun run test`, **Then** the tests pass with updated typings.
2. **Given** a test file, **When** I inspect types, **Then** there are no `any` usages.

---

### Edge Cases

- What happens when third-party or external data does not conform to expected schema?
- How does the system handle legacy data shapes or partial responses?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST remove all explicit `any` and `as any` usages across the monorepo.
- **FR-002**: System MUST replace `any` with explicit, named types or inferred types derived from schemas or contracts.
- **FR-003**: System MUST preserve runtime behavior while improving type safety.
- **FR-004**: System MUST keep API and data flow types aligned with the single source of truth (DB schema → services → routes → clients).
- **FR-005**: System MUST ensure tests compile and run without `any`.

### Key Entities *(include if feature involves data)*

- **Typed Data Flow**: Shared types for API inputs/outputs and UI consumption.
- **Type Contracts**: Schema-derived or contract-defined types to replace `any` usage.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Repo-wide search finds zero `any` or `as any` usage.
- **SC-002**: `bun run typecheck` passes for all packages/apps/services.
- **SC-003**: `bun run test` passes without type-related failures introduced by removal of `any`.
- **SC-004**: All previously untyped API responses and UI mappings are covered by explicit, named types.