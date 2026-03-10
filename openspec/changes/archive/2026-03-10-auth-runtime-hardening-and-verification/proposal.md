## Why

The March 9 auth/mobile program left a smaller set of engineering gaps after the Better Auth migration landed. The remaining work is no longer a broad platform rewrite. It is a targeted hardening pass on mobile refresh determinism, redirect/callback safety across web apps, replay and step-up enforcement, and the verification lanes that prove those flows behave correctly.

The current `auth-runtime-hardening-and-verification` change mixes those actionable engineering gaps with operational sign-off work such as readiness matrices, key rotation drills, and incident playbooks. That makes the change too broad and harder to finish. We need to narrow it to the implementation and verification work that still belongs in the codebase.

## What Changes

- Tighten mobile auth runtime requirements around validated bootstrap behavior, deterministic refresh behavior, and non-production E2E bootstrap guardrails.
- Tighten web auth route policy requirements around redirect allowlists, callback error normalization, OTP replay handling, and passkey step-up enforcement.
- Bind passkey step-up enforcement to concrete sensitive actions: passkey registration, passkey deletion, and finance account deletion.
- Align auth verification requirements with the lanes that exist today: API contract tests, web auth integration coverage, mobile Detox auth flows, and live status/auth verification.
- Remove operations-heavy sign-off work from this change so it can focus on engineering-complete behavior and verification results.

## Capabilities

### Modified Capabilities
- `mobile-auth-state-machine`: Strengthen deterministic mobile auth entry/refresh requirements and E2E bootstrap safety behavior.
- `auth-integration-verification`: Require final cross-surface auth verification gates (API, live, web integration, and mobile Detox) before closeout.
- `auth-email-otp-passkey-contract`: Add final security matrix checks for OTP/passkey flows, redirect controls, callback semantics, and passkey step-up protections.

## Impact

- Affected systems: `apps/mobile`, auth clients in web apps, `services/api`, shared auth helpers, and auth test infrastructure.
- Affected deliverables: Updated OpenSpec requirements, focused hardening tasks, and verification results from existing test lanes.
- Dependencies: Better Auth foundation, existing auth middleware and rate-limit controls, redirect policy ownership across Finance/Notes/Rocco, and mobile/web test harnesses.
- Expected outcome: A narrower auth hardening change that can be completed through concrete code and test work without blocking on broader operational sign-off artifacts.
