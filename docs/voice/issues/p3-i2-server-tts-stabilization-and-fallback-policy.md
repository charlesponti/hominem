# P3-I2: Server TTS Stabilization and Fallback Policy

## Linear Fields

- **Title:** `P3-I2 Server TTS Stabilization and Fallback Policy`
- **Parent:** `Voice I/O Web Rollout`
- **Priority:** `Medium`
- **Labels:** `voice`, `web`, `tts`, `hardening`, `phase-3`
- **Blocked By:** `P3-I1`
- **Blocks:** `None`
- **Feature Flag:** `voice_tts_server_enabled`
- **Rollout Strategy:** Expand cohorts only after threshold checks

## Description

Harden server TTS rollout with clear fallback policy, predictable failure UX, and measurable rollout gates.

## Problem

After server TTS integration, rollout risk shifts from implementation to operational stability: latency spikes, transient endpoint failures, and unclear fallback behavior can degrade trust. We need explicit stabilization rules before broad rollout.

## Solution

Define and implement production stabilization behaviors:
- deterministic stop/retry behavior
- clear failure UX
- optional fallback policy during ramp
- rollout gates based on telemetry

This issue converts a working integration into a production-hardened, supportable feature.

## Implementation Checklist

- [ ] Playback state hardening.
  - [ ] Ensure repeated taps do not create overlapping playback races.
  - [ ] Ensure stop always cancels active source and resets state.

- [ ] Failure UX policy.
  - [ ] Standardize user-visible error handling for request/decode failures.
  - [ ] Keep message action quickly retryable.

- [ ] Fallback policy.
  - [ ] Define whether browser `speechSynthesis` remains temporary fallback.
  - [ ] If fallback retained, gate and log fallback usage.
  - [ ] If fallback removed, verify graceful no-audio failure behavior.

- [ ] Telemetry and rollout thresholds.
  - [ ] Track request failure rate, median/p95 start-playback latency, stop success.
  - [ ] Define go/no-go thresholds for 5% -> 25% -> 100% ramp.

- [ ] Documentation.
  - [ ] Add operational notes for support and incident response.
  - [ ] Document rollback instructions (flag off behavior).

- [ ] Validation.
  - [ ] Manual: rapid-toggle, retry-after-failure, and stop-mid-playback scenarios.
  - [ ] `bun run --filter @hominem/web typecheck`
  - [ ] `bun run --filter @hominem/ui typecheck`

## Deployability

Independently deployable after P3-I1. This is a hardening and rollout-control issue.

## Acceptance Criteria

- Stop/retry behavior is deterministic under rapid interactions.
- Failure UX is clear and recoverable.
- Fallback policy is documented and implemented (temporary or removed).
- Rollout thresholds and dashboards are defined.

## Definition of Done

- Implementation checklist completed.
- Operational guidance and rollback instructions documented.
- Targeted web/ui typechecks pass.

## Rollback Plan

- Freeze rollout at current cohort and disable `voice_tts_server_enabled` if thresholds breach.
- Re-enable after remediation with tightened guardrails.

## Dependencies

- P3-I1 Server TTS Hook and Route Integration

## Unblocks

- Safer full rollout of server TTS to 100% of users.
