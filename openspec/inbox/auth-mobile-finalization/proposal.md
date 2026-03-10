## Why

The March 9 comprehensive auth/mobile plan is still in-progress, with final security gates, mobile verification, and production-readiness sign-off incomplete. The remaining risk is no longer core auth migration work; it is a smaller set of runtime correctness gaps, inconsistent route policy enforcement, unresolved live verification blockers, and missing operational evidence. We need a focused closeout change so the program can transition from “implemented” to “operationally complete” with clear acceptance criteria that match the current Better Auth architecture.

## What Changes

- Add a dedicated operational hardening capability for auth key lifecycle, audit coverage, and incident controls.
- Tighten mobile auth readiness requirements around validated auth deep-link/bootstrap behavior, deterministic refresh behavior, and non-production E2E bootstrap guardrails.
- Tighten auth route policy requirements around redirect allowlists, callback error normalization, OTP replay handling, and passkey step-up enforcement.
- Expand integration verification requirements to require passing API/live auth suites, Maestro reliability runs, and EAS personal-device smoke validation, with explicit treatment of unresolved infrastructure-owned live failures.
- Define explicit closeout deliverables: readiness matrix publication, open-criteria disposition, and production sign-off package.

## Capabilities

### New Capabilities
- `auth-operational-readiness`: Security and operational completion requirements for key rotation, audit telemetry, incident controls, and final readiness sign-off.

### Modified Capabilities
- `mobile-auth-state-machine`: Strengthen deterministic mobile auth entry/refresh requirements and E2E bootstrap safety behavior.
- `auth-integration-verification`: Require final cross-surface auth verification gates (API, live, Maestro, and device lane) before closeout.
- `auth-email-otp-passkey-contract`: Add final security matrix checks for OTP/passkey flows, redirect controls, callback semantics, and passkey step-up protections.

## Impact

- Affected systems: `apps/mobile`, auth clients in web apps, `services/api`, auth test infrastructure, Maestro flows, EAS device build/test lane, security/operations docs.
- Affected deliverables: New/updated OpenSpec requirements, closeout tasks, and runbook/readiness evidence artifacts.
- Dependencies: Better Auth foundation, existing auth middleware and rate-limit controls, CI test lanes, redirect policy ownership across Finance/Notes/Rocco, and deployment/security operations ownership.
- Expected outcome: A fully sign-off-ready auth platform with explicit operational controls and repeatable verification evidence.
