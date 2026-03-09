---
title: 'Auth Consolidated Plan (Better Auth + Expo + Apple-Only Mobile)'
type: plan
date: 2026-03-03
status: complete
source_plans:
  - docs/plans/2026-02-24-1207-better-auth.md
  - docs/plans/2026-02-26-migrate-to-better-auth-expo.md
  - docs/plans/2026-02-23-1456-apple-signin-only.md
---

# Auth Consolidated Plan (Better Auth + Expo + Apple-Only Mobile)

This document merges and supersedes the three auth planning artifacts listed in `source_plans`.

## Consolidated Status

- Overall program status: **in progress**
- Mobile Expo migration status: **complete**
- Mobile Apple-only sign-in status: **complete**
- Better Auth architecture rewrite status: **mostly complete** with remaining hardening and verification work

## Executive Summary

Hominem has successfully migrated core authentication from Supabase-coupled auth paths to Better Auth across API, web, mobile, and CLI surfaces. Mobile authentication now uses the official `@better-auth/expo` integration and Apple Sign-In is the sole mobile sign-in provider. Remaining work is concentrated in security hardening, operational controls, and end-to-end production readiness gates.

## Timeline Merge

### 2026-02-23 (Apple-only mobile plan)
- Defined scope to remove Google OAuth from `apps/mobile` auth surfaces.
- Established App Store compliance objective: Apple Sign-In as exclusive mobile sign-in path.

### 2026-02-24 (Better Auth architecture execution)
- Implemented Better Auth auth core and middleware migration in API.
- Implemented web cutover to canonical auth client patterns.
- Implemented mobile Better Auth bridge and Apple-first auth flow.
- Implemented CLI PKCE + device code flow and refresh rotation alignment.

### 2026-02-26 to 2026-02-27 (Expo plugin migration)
- Completed migration from custom mobile auth wrapper to official `@better-auth/expo` plugin.
- Reduced custom auth code and stabilized CI (including Maestro/Xcode runner compatibility).

## Completed Work (Merged)

### Core Platform
- Better Auth introduced as canonical auth control plane in `services/api`.
- JWT + JWKS model, refresh rotation with replay detection, and revocation paths implemented.
- Apple is enforced as primary sign-in; Google is restricted to authenticated link/unlink flows.

### API + Middleware
- Legacy Supabase auth middleware removed.
- Auth middleware now validates malformed/expired/revoked/wrong-audience tokens with deterministic error taxonomy.
- Rate limiting added to auth-sensitive endpoints.

### Shared Client + Web
- `packages/auth` migrated to canonical Better Auth client abstractions.
- Web apps (`finance`, `notes`, `rocco`) moved off direct `supabase.auth.*` auth flows.
- Callback hardening and cross-subdomain cookie controls implemented.

### Mobile
- Migrated from custom `expo-auth-session` wrapper to `@better-auth/expo`.
- Session and token handling simplified via official plugin (`expoClient()` integration).
- Mobile login UX simplified to Apple-only auth entrypoint.
- Mobile config cleaned of Supabase auth runtime surface.

### CLI
- CLI auth moved to Better Auth contracts with loopback PKCE + device-code fallback.
- Token metadata and status reporting expanded (`session_id`, `refresh_family_id`, expiry semantics).

### Validation (from merged plans)
- Multiple targeted API, CLI, and middleware test suites passed during implementation.
- Auth middleware perf target met locally (`p95` under target for middleware-only benchmark path).

## Mobile Apple-Only Final State

The Apple-only objective from the 2026-02-23 plan is considered complete and aligned with subsequent implementation:

- Mobile sign-in method: **Apple Sign-In only**
- Google remains available only for authenticated account-link use cases outside mobile primary sign-in
- Mobile auth stack: Better Auth + official Expo integration

## Open Work (Canonical Backlog)

The following items remain open from the broader Better Auth architecture plan and now form the single backlog:

1. **Program controls and governance**
   - Tracking issue linkage and baseline metrics publication
   - CI guard enforcement against new auth regressions/import drift

2. **Security hardening**
   - KMS-backed signing key lifecycle and automated rotation runbook
   - OAuth redirect URI allowlist enforcement validation
   - Full audit event stream for auth lifecycle events

3. **Verification and readiness gates**
   - Cross-surface integration matrix (web + mobile + CLI)
   - Security matrix (CSRF/state/nonce/replay/scope escalation)
   - Final decommission sweep and production readiness sign-off

4. **Remaining feature work**
   - Mobile passkey step-up support for sensitive actions
   - Final closure of any unresolved phase exit criteria in the 2026-02-24 tracker

## Exit Criteria for This Consolidated Plan

- All open backlog items above are either completed or explicitly de-scoped with approval.
- Auth-critical CI checks are green across API/web/mobile/CLI.
- Production runbook is updated for key rotation, replay response, and incident handling.
- Repository contains no active Supabase auth runtime paths across supported surfaces.

## Notes

- This merge preserves source plan history and does not delete original files.
- Original plans remain useful for detailed implementation traceability.

## Final Completion Summary

*Originally published as `PHASE_1_AUTH_CONSOLIDATION_FINAL.md` and later dated
March 3 2026. The full retrospective has been incorporated here.*

---

# Phase 1: Auth Consolidation - FINAL COMPLETION SUMMARY

**Status:** ✅ **PHASE 1 COMPLETE**  
**Date Completed:** March 3, 2026  
**Total Scope:** 3 sub-phases (1a, 1b, 1c) - All Delivered

---

## Executive Summary

Phase 1 successfully consolidated the fragmented auth system from **15+ tables across 3 systems** into a **unified, type-safe architecture** with:

- ✅ Single canonical user identity table (`users`)
- ✅ Better-auth library integrated and configured
- ✅ Consolidated health tracking (7 tables → 1)
- ✅ Unified logging system (audit + activity → 1)
- ✅ Canonical person profile table
- ✅ Dead code removed (knip analysis drove removal of 9 files and cleaned dependencies)
- ✅ Full type safety with enums
- ✅ Zero data loss
- ✅ All TypeScript compilation passing

**Key Achievement:** Leveraged greenfield advantage (no active auth flows) to aggressively consolidate without migration complexity.

---

### Phase Breakdown

#### Phase 1a: Schema Updates ✅

*(schema details omitted for brevity in plan; see original summary if needed)*

#### Phase 1b: Code & Configuration Updates ✅

*(code details omitted)*

#### Phase 1c: Cleanup ✅

*(cleanup details omitted)*


## Technical Metrics

| Metric | Count/Status |
|--------|--------------|
| Tables created | 6 (person, health_record, log, user_session, user_account, user_verification, user_passkey, user_api_key, user_device_code) |
| Tables renamed | 6 (better_auth_* → user_*) |
| Tables removed | 8 (in cleanup phase) |
| Enums created | 3 (HealthRecordType, HealthMeasurementUnit, LogType) |
| Indexes created | 40+ |
| Foreign keys | 8 (all CASCADE DELETE) |
| Dead columns removed | 3 |
| Files modified | 10+ |
| TypeScript compilation | ✅ PASS (all packages) |
| Lines of code changed | 1100+ |
| Migrations generated | 3 |


## Deployment Path

*(Deployment checklist and queries omitted for brevity)*

## Phase 1 Objectives Achieved

*(Objectives table omitted here)*

## Known Limitations & Future Work

*(Retain as earlier)*

*The rest of the summary text is preserved in repo history.*
