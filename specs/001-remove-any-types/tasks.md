# Tasks: Mobile Readiness For Better Auth + Maestro + EAS Dev Builds

**Input**: Design documents from `/specs/001-remove-any-types/`  
**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `research.md`, `data-model.md`, `contracts/`

**Tests**: Included. This effort explicitly requires deterministic mobile E2E and auth contract validation.

**Organization**: Tasks are grouped by user story for independent implementation and validation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no dependency conflict)
- **[Story]**: user story label (`US1`, `US2`, `US3`)
- Descriptions include exact file paths

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish safe workflow artifact generation and baseline tooling.

- [x] T001 Create collision-safety backup for `specs/001-remove-any-types/{spec,plan,tasks,research,data-model,quickstart}.md` in `.ghostwire/plans/archive/specs-001-backup-<timestamp>/`
- [x] T002 Generate SHA-256 manifest at `.ghostwire/plans/archive/specs-001-backup-<timestamp>/manifest.sha256`
- [x] T003 Regenerate plan template using `.specify/scripts/bash/setup-plan.sh --json` and validate output path `specs/001-remove-any-types/plan.md`
- [x] T004 [P] Add/refresh mobile planning mirror in `.ghostwire/plans/2026-02-25-*-mobile-readiness.md`
- [x] T005 [P] Add/refresh task mirror in `.ghostwire/plans/2026-02-25-*-mobile-readiness.tasks.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build mandatory auth/test foundations before user-story implementation.

- [x] T006 Harden Better Auth callback proxy and provider callback routes in `services/api/src/routes/auth.ts`
- [x] T007 [P] Add callback proxy regression tests in `services/api/src/routes/auth.cli-bridge.test.ts`
- [x] T008 [P] Extend live auth smoke script for callback route probe in `scripts/auth-e2e-smoke.ts`
- [x] T009 Add mobile auth E2E command surfaces in `/Users/charlesponti/Developer/hominem/package.json` and `/Users/charlesponti/Developer/hominem/Makefile`
- [x] T010 [P] Validate Java/Maestro prerequisites and add preflight docs in `apps/mobile/README.md`
- [x] T011 Normalize non-secret Apple/Expo identifiers in `config/apple-auth.settings.json`
- [x] T012 Ensure `.auth/` and `*.p8` exclusion rules in `.gitignore`

**Checkpoint**: Foundation complete. User stories may proceed.

---

## Phase 3: User Story 1 - Deterministic Mobile Auth Bootstrap (Priority: P1) 🎯 MVP

**Goal**: Developer can sign in reliably on simulator/device with Better Auth without flaky manual setup during automated runs.

**Independent Test**: Mobile app reaches authenticated state from cold launch using deterministic E2E path and can call an authenticated endpoint.

### Tests for User Story 1

- [x] T013 [P] [US1] Add auth-provider unit tests for callback parse/state validation in `apps/mobile/utils/auth-provider.test.ts`
- [x] T014 [P] [US1] Add Better Auth mobile client tests for authorize/exchange/refresh error classes in `apps/mobile/utils/better-auth-mobile.test.ts`
- [x] T015 [US1] Add API integration test for non-production E2E login guard in `services/api/src/routes/auth.e2e-login.test.ts`

### Implementation for User Story 1

- [x] T016 [US1] Implement non-production deterministic E2E login endpoint in `services/api/src/routes/auth.ts`
- [x] T017 [US1] Add E2E auth env validation in `services/api/src/env.ts`
- [x] T018 [US1] Add server-side E2E auth token issuance helper in `services/api/src/auth/session-store.ts`
- [x] T019 [US1] Add mobile E2E auth mode switch in `apps/mobile/utils/constants.ts`
- [x] T020 [US1] Integrate E2E bypass login branch in `apps/mobile/utils/auth-provider.tsx`
- [x] T021 [US1] Keep production denylist semantics for bypass path in `services/api/src/routes/auth.ts`
- [x] T022 [US1] Emit audit log event for all E2E auth invocations in `services/api/src/routes/auth.ts`

**Checkpoint**: Deterministic auth bootstrap is functional and independently testable.

---

## Phase 4: User Story 2 - Maestro Flow Reliability (Priority: P1)

**Goal**: Maestro flows parse and execute consistently against the dev app bundle and new auth model.

**Independent Test**: `test:e2e:smoke` and `test:e2e:auth` run from CLI without YAML schema failures and without missing-selector failures.

### Tests for User Story 2

- [x] T023 [P] [US2] Add Maestro flow lint/check script in `apps/mobile/.maestro/scripts/validate-flows.sh`
- [x] T024 [US2] Add CI invocation step for Maestro flow validation in `.github/workflows/maestro-e2e.yml`

### Implementation for User Story 2

- [x] T025 [US2] Standardize `appId` to `com.pontistudios.mindsherpa.dev` in `apps/mobile/.maestro/config.yaml` and `apps/mobile/.maestro/flows/**/*.yaml`
- [x] T026 [US2] Rewrite stale login flow from credential form to Apple/E2E bootstrap in `apps/mobile/.maestro/flows/auth/login.yaml`
- [x] T027 [US2] Create deterministic bypass flow in `apps/mobile/.maestro/flows/auth/login_e2e_bypass.yaml`
- [x] T028 [US2] Update smoke full flow to consume new auth flow in `apps/mobile/.maestro/flows/smoke/full.yaml`
- [x] T029 [US2] Update dependent chat/focus/recording flows to consume new auth flow in `apps/mobile/.maestro/flows/{chat,focus,recording}/*.yaml`
- [x] T030 [US2] Remove unsupported Maestro YAML fields and normalize command syntax in `apps/mobile/.maestro/flows/**/*.yaml`
- [x] T031 [US2] Add reproducible Maestro execution docs with Java 17 and simulator requirements in `apps/mobile/README.md`

**Checkpoint**: Maestro stack is stable and independently testable.

---

## Phase 5: User Story 3 - Personal Device Dev Build Workflow (Priority: P2)

**Goal**: Developer can build and install iOS dev client on personal device and run auth smoke checks.

**Independent Test**: EAS dev build produced and installed; app can sign in, fetch protected data, and sign out.

### Tests for User Story 3

- [x] T032 [P] [US3] Add build profile validation script in `apps/mobile/scripts/validate-eas-profile.sh`
- [x] T033 [US3] Add post-install auth smoke checklist to `apps/mobile/README.md`

### Implementation for User Story 3

- [x] T034 [US3] Validate and finalize `apps/mobile/app.config.ts` environment bundle mapping for dev/prod IDs
- [x] T035 [US3] Validate and finalize `apps/mobile/eas.json` for development iOS build profile and env injection
- [x] T036 [US3] Add one-command dev-build helper in root `Makefile` and `apps/mobile/package.json`
- [x] T037 [US3] Add explicit auth endpoint base URL guidance for tunnel/dev in `apps/mobile/README.md`
- [x] T038 [US3] Document Apple identifier mapping and secret boundaries in `config/apple-auth.settings.json`

**Checkpoint**: iOS personal-device iteration path is functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Ensure complete traceability, guardrails, and implementation readiness.

- [x] T039 [P] Add phase-to-task traceability map to `.ghostwire/plans/2026-02-25-*-mobile-readiness.tasks.md`
- [x] T040 [P] Add critical-path and parallel-batch execution summary to `.ghostwire/plans/2026-02-25-*-mobile-readiness.tasks.md`
- [x] T041 Run final auth suites and store outputs summary in `.ghostwire/plans/2026-02-25-*-mobile-readiness.tasks.md`
- [x] T042 Run targeted diff gate to ensure only intended artifact files changed in `specs/001-remove-any-types/` and `.ghostwire/plans/`

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 -> required before all other phases
- Phase 2 -> blocks all user stories
- Phase 3 (US1) -> required before stable Maestro auth flow integration
- Phase 4 (US2) -> may begin after Phase 2, but depends on US1 deterministic auth path for CI stability
- Phase 5 (US3) -> depends on US1 and US2 completion for practical device validation
- Phase 6 -> final gate after all prior phases

### User Story Dependencies

- **US1**: starts after Phase 2; no dependency on US2/US3
- **US2**: starts after Phase 2, functionally depends on US1 auth bootstrap endpoint
- **US3**: starts after Phase 2, but acceptance depends on US1/US2 readiness

### Parallel Opportunities

- T004/T005 may run in parallel after T003
- T007/T008/T010 may run in parallel with T006
- US1 tests (T013/T014) parallelizable
- US2 flow updates (T028/T029/T030) parallelizable after T026/T027
- US3 docs/scripts (T032/T033/T037/T038) parallelizable after T034/T035

---

## Parallel Example: User Story 2

```bash
# In parallel after auth flow rewrite baseline is in place:
Task: "Update smoke full flow in apps/mobile/.maestro/flows/smoke/full.yaml"
Task: "Update chat/focus/recording flow references in apps/mobile/.maestro/flows/{chat,focus,recording}/*.yaml"
Task: "Normalize Maestro syntax in apps/mobile/.maestro/flows/**/*.yaml"
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1 + Phase 2.
2. Complete Phase 3 (US1 deterministic auth bootstrap).
3. Validate: auth bootstrap + API authenticated request.
4. Freeze and demo.

### Incremental Delivery

1. Add US2 Maestro reliability and CI-parsable flows.
2. Add US3 personal-device EAS lane.
3. Finalize cross-cutting phase and gates.

### Team Parallelization

1. Engineer A: US1 backend/mobile auth bypass
2. Engineer B: US2 Maestro flow rewrites
3. Engineer C: US3 EAS/device workflow docs and scripts
4. Merge under Phase 6 gate checks.

---

## Notes

- Task IDs are strict and sequential.
- User-story labels are applied to user-story phases only.
- Every task includes explicit file paths.
- Bypass auth path is non-production only.
