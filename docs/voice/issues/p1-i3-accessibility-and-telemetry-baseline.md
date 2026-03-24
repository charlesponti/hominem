# P1-I3: Accessibility and Telemetry Baseline

## Linear Fields

- **Title:** `P1-I3 Accessibility and Telemetry Baseline`
- **Parent:** `Voice I/O Web Rollout`
- **Priority:** `High`
- **Labels:** `voice`, `a11y`, `analytics`, `phase-1`
- **Blocked By:** `None`
- **Blocks:** `P2-I1`, `P3-I1`, `P4-I1`
- **Feature Flag:** `N/A`
- **Rollout Strategy:** Ship directly; baseline instrumentation and accessibility

## Description

Create minimum a11y and observability guarantees for voice interactions so later feature rollouts are measurable and safe.

## Problem

Voice interactions are high-variance and need both accessibility guarantees and production observability to be safely rolled out. Current gaps include missing or inconsistent a11y announcements and incomplete event capture. Without these baselines, regressions are hard to detect, and users relying on assistive tech can have degraded experiences.

## Solution

Add a minimum viable but robust baseline for both:
- Accessibility: live/status announcements, proper dialog labeling, keyboard/focus behavior.
- Telemetry: reliable emission for core voice lifecycle events with backend capture attempt and safe fallback logging.

This ensures every subsequent voice issue can be measured and audited.

## Implementation Checklist

- [ ] Accessibility baseline in voice surfaces.
  - [ ] Add/verify `aria-live` announcements for recording state transitions.
  - [ ] Add/verify status region for processing state.
  - [ ] Ensure voice dialog is labeled (`aria-labelledby`) and keyboard-dismissible (`Escape`).
  - [ ] Ensure focus behavior is predictable in dialog-based voice surfaces.

- [ ] Telemetry baseline.
  - [ ] Emit `voice_record_started` and `voice_record_stopped` from recording lifecycle.
  - [ ] Emit transcription request/success/failure events in caller flow.
  - [ ] Route events through shared utility.
  - [ ] Attempt PostHog capture when available; preserve non-throwing fallback logging.

- [ ] Event payload quality.
  - [ ] Include consistent core fields (`platform`, `mimeType`, `sizeBytes`, etc. when available).
  - [ ] Keep payload shape stable across callers.

- [ ] Validation.
  - [ ] Manual screen-reader sanity pass for state changes.
  - [ ] Manual permission-denied flow emits expected event and user-facing error.
  - [ ] Verify events appear in analytics pipeline for internal rollout cohort.

- [ ] Run validation commands.
  - [ ] `bun run --filter @hominem/ui typecheck`
  - [ ] `bun run --filter @hominem/services typecheck`

## Deployability

This issue is independently shippable and should be shipped early. It adds safety rails required for reliable staged rollout of all later voice issues.

## Acceptance Criteria

- Recording/processing states are announced in voice UI.
- Voice dialog labeling and keyboard behavior are compliant.
- Core voice lifecycle events are emitted and captured when PostHog is available.
- Fallback logging path is non-throwing.

## Definition of Done

- Implementation checklist completed.
- Manual a11y checks pass for key voice interactions.
- Event payloads visible in analytics for internal test traffic.

## Rollback Plan

- Revert telemetry capture additions if they cause runtime issues; retain console fallback.
- Revert a11y deltas only if they cause UI breakage and re-ship with targeted fixes.

## Dependencies

- None

## Unblocks

- P2-I1 Inline Capture MVP Behind Flag
- P3-I1 Server TTS Hook and Route Integration
- P4-I1 Voice Mode MVP (Manual Push-to-Talk)
