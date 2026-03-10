---
title: 'Comprehensive Auth Evolution + Mobile Implementation Plan'
type: plan
date: 2026-03-09
status: in-progress
scope: 'Google Auth -> Apple-only -> Better Auth (email+OTP+passkey) with mobile readiness hardening'
source_plans:
  - docs/plans/2026-02-23-1456-apple-signin-only.md
  - docs/plans/2026-02-24-1207-better-auth.md
  - docs/plans/2026-02-25-2341-mobile-readiness.md
  - docs/plans/2026-02-25-2341-mobile-readiness.tasks.md
  - docs/plans/2026-02-26-migrate-to-better-auth-expo.md
  - docs/plans/2026-02-27-auth-consolidation.md
---

# Comprehensive Auth Evolution + Mobile Implementation Plan

**Overview**: This is the single, merged plan that explains how auth evolved across the repo and mobile app:
1. Legacy Google-inclusive auth and Supabase-coupled paths
2. Apple-only enforcement for mobile compliance
3. Better Auth consolidation with email + OTP + passkey capabilities
4. Mobile readiness hardening (deterministic auth flows, Maestro reliability, EAS device lane)

---

## Program Status

| Component | Status | Owner Deliverable |
|-----------|--------|-------------------|
| **Legacy Google-first mobile auth** | ✅ Retired | Replaced by Apple-only primary sign-in |
| **Apple-only mobile transition** | ✅ Complete | App Store-compliant sign-in surface |
| **Better Auth platform rewrite** | ✅ Complete | Canonical API/web/mobile/CLI auth plane |
| **Email + OTP + Passkey capability** | ✅ Implemented in Better Auth stack | One-time-token + passkey + step-up flows |
| **Mobile Expo plugin migration** | ✅ Complete | `@better-auth/expo` integrated |
| **Mobile runtime hardening** | 🟡 In Progress | Deterministic callback + refresh semantics |
| **Maestro modernization** | 🟡 In Progress | Schema-compatible, deterministic E2E auth |
| **Personal device EAS lane** | 🟡 In Progress | Reproducible install + smoke workflow |
| **Security/operational final gates** | 🟡 In Progress | Rotation drills, telemetry completeness |

---

## Section 1: Auth Evolution Narrative

### 1.1 Stage A - Google-Influenced Legacy State

Initial state issues:
- Supabase-coupled auth paths across API, web, and mobile
- Mixed provider behavior (Google and Apple assumptions differed by surface)
- Fragmented session/token behavior across app, mobile, and CLI
- Limited deterministic automation for mobile E2E flows

### 1.2 Stage B - Apple-Only Mobile Enforcement

Why this phase happened:
- Mobile needed a single compliant sign-in path for App Store expectations
- Google sign-in was removed from mobile primary auth UX
- Apple sign-in became the sole first-party mobile entry point

What changed:
- Removed Google OAuth flows from mobile auth provider/UI
- Kept Apple sign-in path and test infrastructure
- Preserved web Google linking where required, but not mobile primary login

### 1.3 Stage C - Better Auth Consolidation (Current Foundation)

The auth architecture was rebuilt around Better Auth and standardized contracts:
- JWT + JWKS with local verification for low-latency auth checks
- Refresh token family rotation with replay detection and revocation
- Unified auth middleware and error taxonomy across REST and RPC
- Canonical identity mapping using auth subjects instead of Supabase-specific IDs
- CLI loopback PKCE with device-code fallback

### 1.4 Stage D - Better Auth Capability Set (Email + OTP + Passkey)

Final capability model in this merged plan:
- `Apple OAuth`: primary mobile and supported sign-in path
- `Email + OTP`: enabled through Better Auth one-time-token style flows for passwordless entry and recovery semantics
- `Passkey`: registration/auth verification and step-up actions for sensitive operations
- `Google`: no longer primary sign-in; restricted to authenticated linking where applicable

### 1.5 Final Auth Method Matrix

| Surface | Primary Sign-In | Secondary/Recovery | Step-Up | Notes |
|---------|------------------|--------------------|---------|-------|
| Mobile (`apps/mobile`) | Apple | Email + OTP (Better Auth-compatible path), E2E non-prod bypass | Passkey (sensitive actions) | Google removed as primary |
| Web (`apps/finance`, `apps/notes`, `apps/rocco`) | Better Auth canonical client flows | Email + OTP | Passkey | Google is link/unlink only |
| API (`services/api`) | Provider-agnostic token endpoints | OTP/token grants | Passkey verify endpoints | JWT/JWKS + revocation |
| CLI (`tools/cli`) | Loopback PKCE | Device code fallback | N/A | Refresh family metadata tracked |

---

## Section 2: Consolidated Phases And Steps Taken

This section is the merged implementation record from the source plans.

### Phase 0: Program Controls And Baseline

Objective:
- Define metrics, CI guardrails, and rewrite boundaries before auth migration.

Steps taken:
- Established phased migration plan and execution tracker.
- Added/validated CI and test gates around auth routes.

Status: 🟡 Partially complete (some governance and baseline publication still open)

### Phase 1: Apple-Only Mobile Transition

Objective:
- Move mobile from mixed Google/Apple to Apple-only sign-in.

Steps taken:
- Removed Google primary sign-in paths from mobile auth surfaces.
- Kept Apple sign-in UX and compliance-oriented config.
- Preserved testability and E2E hooks during provider reduction.

Status: ✅ Complete

### Phase 2: Better Auth Core In API

Objective:
- Replace Supabase auth runtime with Better Auth core endpoints and policies.

Steps taken:
- Implemented Better Auth server module and auth routes.
- Added JWT issuance and JWKS discovery endpoint.
- Added refresh/revoke/logout lifecycle routes.
- Enforced deterministic auth error taxonomy.

Status: ✅ Complete

### Phase 3: Data Model And Persistence Rewrite

Objective:
- Introduce canonical auth tables and remove Supabase-coupled identity dependencies.

Steps taken:
- Added auth tables for subjects, sessions, refresh tokens, passkeys, and device codes.
- Migrated identity linkage from `users.supabase_id` patterns to auth subject mapping.
- Added constraints and indexes for provider uniqueness and token family lookups.

Status: ✅ Complete (with remaining optional at-rest encryption strategy work)

### Phase 4: Middleware And Authorization Plane

Objective:
- Deliver low-latency, local JWT validation and consistent authorization context.

Steps taken:
- Replaced Supabase middleware with Better Auth middleware.
- Added bearer/cookie extraction precedence and typed failures.
- Added revocation hot paths with Redis-backed checks and DB fallback.
- Verified middleware performance targets.

Status: ✅ Complete

### Phase 5: Client And Surface Cutovers (Web + CLI)

Objective:
- Ensure all consumers use canonical auth clients and contracts.

Steps taken:
- Migrated web app auth calls to canonical `packages/auth` client APIs.
- Standardized OAuth callback handling and redirect safety.
- Added CLI authorize/callback/exchange and device-code fallback flows.
- Updated CLI token metadata and status semantics.

Status: ✅ Complete

### Phase 6: Mobile Better Auth Expo Migration

Objective:
- Replace custom mobile wrapper with official `@better-auth/expo` integration.

Steps taken:
- Added `expoClient()` plugin-based auth client.
- Enabled required package export support and deep link/trusted origin wiring.
- Refactored mobile auth provider to official client session model.
- Reduced custom auth code and validated no regressions in core flows.

Status: ✅ Complete

### Phase 7: Mobile Readiness Hardening (US1/US2/US3)

Objective:
- Make mobile auth deterministic for automation and reliable on personal devices.

US1 steps (deterministic auth bootstrap):
- Added non-production E2E login endpoint and guardrails.
- Hardened callback parse/PKCE/state checks and refresh scheduler semantics.
- Added audit logging for E2E auth invocations.

US2 steps (Maestro reliability):
- Standardized Maestro app IDs and schema-compatible syntax.
- Rewrote stale login flows to Apple/E2E bootstrap flows.
- Added flow validation scripts and CI execution hooks.

US3 steps (EAS device lane):
- Finalized app config and EAS profile mapping.
- Added one-command dev-build helpers.
- Documented personal device install and auth smoke checklist.

Status: 🟡 In progress (implementation largely done; final verification gates remain)

### Phase 8: Security Hardening And Operational Readiness

Objective:
- Complete production-hardening and runbook-quality controls.

Steps completed:
- Route-level rate limiting on auth-sensitive endpoints.
- Passkey and step-up grant enforcement for sensitive actions.

Open steps:
- KMS-backed key lifecycle automation and rotation drills.
- Full audit stream visibility and retention policy alignment.
- Final security matrix execution (CSRF/state/nonce/replay/scope).

Status: 🟡 In progress

---

## Section 3: Final Implementation Snapshot

### 3.1 Core Platform Outcomes

- Better Auth is the canonical control plane in API/web/mobile/CLI.
- Supabase auth runtime paths are removed from active surfaces.
- Apple-only mobile primary sign-in objective is complete.
- Email + OTP + passkey capability is included in the Better Auth model.

### 3.2 Mobile Outcomes

- Official Expo plugin migration complete.
- Deterministic E2E bootstrap path added for non-production automation.
- Maestro flows modernized with new auth assumptions.
- Device build lane documented and scaffolded via EAS helpers.

### 3.3 Validation Snapshot

- API auth suites and middleware tests reported passing in tracker updates.
- Mobile provider/client tests reported passing in tracker updates.
- Remaining live endpoint issue: `https://auth.ponti.io/api/status` returning `502`.

---

## Section 4: Remaining Work To Finalize

### 4.1 Security And Operations

- [ ] Complete KMS signing key rotation runbook and drill.
- [ ] Validate redirect URI allowlist and scope escalation checks in final matrix.
- [ ] Complete full auth lifecycle audit event coverage and retention policy.

### 4.1.1 Carry-Forward Hardening Items (From Legacy Auth Email Guard Plan)

- [ ] Define and publish auth invariants and threat model doc (`docs/AUTH.md`).
- [ ] Enforce explicit route auth policy with default-deny semantics for sensitive endpoints.
- [ ] Add deactivated-account safety controls (`deactivatedAt`, deny-login behavior, audited responses).
- [ ] Add safe email-change verification policy with audit logging.
- [ ] Confirm CSRF protections for cookie-backed state-changing requests.
- [ ] Document emergency auth controls (force reauth, disable login, incident playbook).
- [ ] Validate profile update field allowlists and ensure privileged fields are blocked.

### 4.2 Mobile Verification

- [ ] Run final mobile auth suite gates (`test:e2e:auth:api`, `test:e2e:auth:live`).
- [ ] Confirm Maestro smoke/auth runs with no schema or selector failures.
- [ ] Validate personal iPhone install and smoke checklist end-to-end.

### 4.3 Program Closeout

- [ ] Publish final cross-surface readiness matrix.
- [ ] Confirm all open tracker criteria are complete or explicitly de-scoped.
- [ ] Sign off production readiness for auth.

---

## Section 5: Execution Order For Final Completion

1. Resolve live auth smoke infra issue (`/api/status` 502).
2. Run and capture full auth verification suite across API/mobile/CLI.
3. Complete key management and incident-response runbooks.
4. Execute final security matrix and attach results.
5. Approve and mark program fully complete.

---

## Section 6: References

- `docs/plans/2026-02-27-auth-consolidation.md`
- `docs/plans/auth-email-guard-plan.md`

---

## Sign-Off

This file is the single cohesive merged plan for the auth journey and final implementation path.

**Last Updated**: 2026-03-09  
**Current State**: Auth platform consolidated; mobile readiness and operational hardening in finalization.
