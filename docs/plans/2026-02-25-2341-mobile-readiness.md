# Mobile Readiness Plan Mirror

## Mirror Metadata
- source: `/Users/charlesponti/Developer/hominem/specs/001-remove-any-types/plan.md`
- branch: `001-fix-mobile-app-build-maestro`
- workflow: `.specify/scripts/bash/setup-plan.sh --json` + operator-authored plan fill
- mirrored_at: `2026-02-25T23:44:00-08:00`

## Sync Contract
- Source of truth: `specs/001-remove-any-types/plan.md`
- `.ghostwire/plans` copy role: progress-tracking snapshot
- Update rule: copy-forward this mirror after each major revision of the source plan

---
# Implementation Plan: Mobile Readiness For Better Auth + Maestro + EAS Dev Builds

**Branch**: `001-fix-mobile-app-build-maestro` | **Date**: 2026-02-25 | **Spec**: `/Users/charlesponti/Developer/hominem/specs/001-remove-any-types/spec.md`
**Input**: Mobile-readiness scope applied to existing `001` feature namespace per operator decision

## Summary

Stabilize the iOS mobile stack for deterministic development and validation by hardening Better Auth mobile flows, modernizing Maestro automation, and establishing a reproducible EAS development-build distribution lane for personal-device testing. The target state is a repeatable pipeline where auth and smoke tests pass in CLI, manual Apple verification remains available, and developers can reliably install and iterate on physical devices.

## Progress Snapshot (2026-02-25)

- Completed: workflow artifact generation/mirroring, callback proxy hardening, mobile deterministic E2E endpoint, Maestro flow rewrite, EAS/dev build helper scaffolding, US1 unit tests, and E2E auth audit logging.
- Open operational issue: live auth smoke endpoint on `https://auth.ponti.io/api/status` still returns `502` and requires infra follow-up.

## Technical Context

**Language/Version**: TypeScript 5.9, React Native 0.81.5, Expo SDK 54, Bun 1.3.0  
**Primary Dependencies**: expo-auth-session, expo-web-browser, expo-secure-store, better-auth API endpoints, Maestro 2.2.0, EAS CLI 18.x  
**Storage**: SecureStore for refresh tokens; in-memory access token cache; LocalStore user profile cache  
**Testing**: Maestro E2E flows, Vitest API auth integration tests, live auth smoke script (`scripts/auth-e2e-smoke.ts`)  
**Target Platform**: iOS simulator + personal iPhone device (development builds)  
**Project Type**: Mobile + API + monorepo shared packages  
**Performance Goals**: Auth bootstrap p95 under 2s on warm launch; token refresh before T-120s expiry window; no user-visible auth race conditions  
**Constraints**: Apple primary sign-in only; Google link only post-auth; no Supabase auth dependencies in mobile path; non-production-only E2E bypass controls  
**Scale/Scope**: Single mobile app path (`apps/mobile`) plus API auth surfaces (`services/api`) and workflow artifacts (`specs/001-*`, `.ghostwire/plans`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **RPC/DB boundary**: preserved. Mobile app consumes API via auth/provider utilities; no direct DB access introduced.
- **Security controls**: explicit handling for token storage, replay-safe refresh family semantics, and production denial of E2E bypass.
- **Type safety and linting**: all new interfaces and command contracts remain typed; no `any`/`unknown` additions required for this planning artifact.
- **Operational determinism**: workflow outputs are mirrored and checksum-tracked to avoid accidental artifact drift.

Post-design gate status: **PASS**, contingent on implementation tasks completing acceptance checks.

## Project Structure

### Documentation (this feature)

```text
specs/001-remove-any-types/
├── plan.md              # This file
├── research.md          # Existing research artifact (retained)
├── data-model.md        # Existing data-model artifact (retained)
├── quickstart.md        # Existing quickstart artifact (retained)
├── contracts/           # Existing contracts artifact (retained)
└── tasks.md             # Task execution plan for mobile-readiness work
```

### Source Code (repository root)

```text
apps/mobile/
├── app/
├── components/
├── utils/
│   ├── auth-provider.tsx
│   ├── better-auth-mobile.ts
│   └── use-authenticated-request.ts
└── .maestro/
    ├── config.yaml
    └── flows/

services/api/
├── src/routes/auth.ts
├── src/auth/
└── scripts/

scripts/
└── auth-e2e-smoke.ts

config/
└── apple-auth.settings.json

.ghostwire/plans/
└── [timestamp]-mobile-readiness*.md
```

**Structure Decision**: Use existing monorepo structure with focused changes to `apps/mobile` and `services/api`, plus mirrored planning artifacts in `.ghostwire/plans` for operator progress tracking.

## Implementation Plan

### Phase 1: Workflow Artifact Safety + Planning Baseline
*Estimate: 1-2 hours*  
*Objective: Regenerate and stabilize planning artifacts in `001` namespace without collateral loss.*

- [ ] Snapshot `specs/001-remove-any-types/{spec,plan,tasks,research,data-model,quickstart}.md` into `.ghostwire/plans/archive/specs-001-backup-<timestamp>/`.
- [ ] Generate checksum manifest for snapshot and store in archive directory.
- [ ] Regenerate `specs/001-remove-any-types/plan.md` using workflow template.
- [ ] Fill plan with mobile-readiness design details and remove unresolved placeholders.
- [ ] Mirror plan snapshot into `.ghostwire/plans/2026-02-25-<time>-mobile-readiness.md`.
- [ ] Add sync contract section in mirror declaring canonical source and copy-forward rule.

#### Phase 1 Acceptance Criteria
- [ ] Backup directory exists with all six markdown artifacts and `manifest.sha256`.
- [ ] `specs/001-remove-any-types/plan.md` contains no unresolved placeholder markers.
- [ ] Plan mirror exists in `.ghostwire/plans/` with metadata block and sync contract.
- [ ] **Verification Command**: `python - <<'PY'\nfrom pathlib import Path\np = Path('specs/001-remove-any-types/plan.md').read_text()\nassert 'NEEDS' not in p and 'clarification' not in p.lower() and 'todo' not in p.lower()\nprint('ok')\nPY`

---

### Phase 2: Mobile Auth Runtime Hardening
*Estimate: 1-2 days*  
*Objective: Make Better Auth mobile sign-in/exchange/refresh/revoke flows robust for simulator and device usage.*

- [ ] Normalize callback parsing and PKCE/state validation in `apps/mobile/utils/better-auth-mobile.ts`.
- [ ] Add deterministic error taxonomy for auth/network/system-cancel cases in `apps/mobile/utils/auth-provider.tsx`.
- [ ] Harden refresh scheduler and resume semantics (T-120s proactive refresh + jitter) in `apps/mobile/utils/auth-provider.tsx`.
- [ ] Confirm refresh token storage remains SecureStore-only and access token remains memory-only.
- [ ] Add explicit telemetry and structured logs for sign-in, refresh, revoke, and callback failures.
- [ ] Validate API callback alias stability (`/api/auth/callback/apple`) and internal Better Auth proxy path consistency.

#### Phase 2 Acceptance Criteria
- [ ] Mobile sign-in succeeds on simulator and iPhone dev build.
- [ ] Token refresh rotates cleanly and re-auth is triggered on invalid refresh.
- [ ] Sign-out revokes refresh token and clears client state.
- [ ] **Verification Command**: `bun run test:e2e:auth:api && bun run test:e2e:auth:live`

---

### Phase 3: Maestro Modernization (Apple-Only + Deterministic E2E)
*Estimate: 1 day*  
*Objective: Make Maestro flows parse, run, and produce deterministic auth setup for automation.*

- [ ] Standardize Maestro app IDs to dev bundle identifier (`com.pontistudios.mindsherpa.dev`) across all flow YAMLs.
- [ ] Update flow syntax to Maestro v2-compatible command schema.
- [ ] Replace stale credential-form login steps with Apple-only or deterministic E2E bypass login flow.
- [ ] Add dedicated bypass auth flow (`login_e2e_bypass.yaml`) for CI and scripted runs.
- [ ] Add preflight script checks for Java 17, Maestro binary availability, and booted simulator detection.
- [ ] Wire package scripts and Make targets for one-command mobile E2E execution.

#### Phase 3 Acceptance Criteria
- [ ] `maestro test` smoke flow parses and executes without schema errors.
- [ ] Auth bootstrap flow no longer references removed email/password test selectors.
- [ ] E2E flows can establish authenticated state without manual Apple UI in E2E mode.
- [ ] **Verification Command**: `bun run --filter @hominem/mobile test:e2e:smoke && bun run --filter @hominem/mobile test:e2e:auth`

---

### Phase 4: EAS Development Build + Personal Device Lane
*Estimate: 0.5-1 day*  
*Objective: Ensure developers can install and test on personal devices reliably.*

- [ ] Validate `apps/mobile/app.config.ts` environment mapping for dev/prod bundle IDs.
- [ ] Verify EAS owner/project mapping and profile consistency in `apps/mobile/eas.json`.
- [ ] Document reproducible iOS dev build commands and install flow.
- [ ] Add post-install auth smoke checklist (launch -> login -> protected API -> logout).
- [ ] Ensure all required Apple identifiers are documented in `config/apple-auth.settings.json` (non-secret values only).

#### Phase 4 Acceptance Criteria
- [ ] Development build can be installed on personal iPhone.
- [ ] Auth smoke scenario completes on physical device.
- [ ] **Verification Command**: `eas project:info --non-interactive` (from `apps/mobile`) and `eas build --profile development --platform ios`

---

### Phase 5: Task Artifact Generation + Traceability
*Estimate: 2-4 hours*  
*Objective: Generate executable tasks and maintain synchronized mirrors with acceptance mapping.*

- [ ] Generate `specs/001-remove-any-types/tasks.md` in strict checklist format.
- [ ] Ensure tasks include mobile-critical coverage: auth hardening, Maestro rewrite, E2E bypass, EAS lane, CI gates.
- [ ] Mirror task artifact to `.ghostwire/plans/2026-02-25-<time>-mobile-readiness.tasks.md`.
- [ ] Add traceability map from each plan phase to corresponding task IDs.
- [ ] Add critical-path and parallelization summary to task mirror.

#### Phase 5 Acceptance Criteria
- [ ] Every task entry conforms to `- [ ] T### [P?] [US#?] Description with file path`.
- [ ] Each phase acceptance criterion maps to at least one task ID.
- [ ] Pre/post diff confirms only intended artifact files changed.
- [ ] **Verification Command**: `rg -n "^- \[ \] T[0-9]{3}" specs/001-remove-any-types/tasks.md`

## Complexity Tracking

No constitution violations required for this scope. Complexity is bounded to existing monorepo mobile/auth pathways and artifact generation.
