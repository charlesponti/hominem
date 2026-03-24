# P1-I2: API Contract Correctness and Language Path

## Linear Fields

- **Title:** `P1-I2 API Contract Correctness and Language Path`
- **Parent:** `Voice I/O Web Rollout`
- **Priority:** `High`
- **Labels:** `voice`, `api`, `contracts`, `phase-1`
- **Blocked By:** `None`
- **Blocks:** `P4-I1`, `P4-I3`
- **Feature Flag:** `voice_mode_enabled` (consumer), `voice_mode_auto_loop_enabled` (consumer)
- **Rollout Strategy:** Ship directly; contract correctness only

## Description

Align transcription language hinting and `/voice/respond` format behavior with runtime reality. This removes client ambiguity and improves cross-locale quality.

## Problem

Two contract-level issues degrade correctness across voice flows:

1. Transcription language hinting can be hardcoded or missing, reducing quality for non-English users.
2. `/voice/respond` response format expectations can drift from runtime reality (PCM16 streaming), creating decode ambiguity and client bugs.

Without this fix, client implementations are forced to carry defensive assumptions and may fail unpredictably across locales and playback paths.

## Solution

Enforce an explicit, consistent voice API contract:
- Language hint flows from client to API to transcription service.
- `/voice/respond` is aligned to PCM16 behavior end-to-end (service types, route behavior, tests, docs).

This issue keeps contracts honest and reduces integration complexity for all subsequent phases.

## Implementation Checklist

- [ ] Complete language hint pass-through.
  - [ ] Web mutation accepts optional `language`.
  - [ ] Caller provides `navigator.language` when available.
  - [ ] API routes read and forward `language` from multipart body.
  - [ ] Remove hardcoded `language: 'en'` assumptions in route handlers.

- [ ] Align `/voice/respond` format contract.
  - [ ] Restrict effective output contract to PCM16 where streaming requires it.
  - [ ] Ensure route defaults and docs reflect PCM16 behavior.
  - [ ] Ensure response headers/content type are consistent with returned bytes.

- [ ] Update tests to enforce contract.
  - [ ] Service tests assert PCM16 expectations.
  - [ ] Route behavior assertions cover language forwarding and response consistency.

- [ ] Clean implementation hazards.
  - [ ] Remove dynamic module access patterns where static imports are safer.
  - [ ] Ensure no hidden behavior divergence between docs/types/runtime.

- [ ] Run validation.
  - [ ] `bun run --filter @hominem/services typecheck`
  - [ ] `bun run --filter @hominem/api typecheck`
  - [ ] relevant service tests for voice response/transcription

## Deployability

This issue is independently shippable. It improves correctness and reduces downstream risk without requiring new UI rollout.

## Acceptance Criteria

- Client language hint is passed through API to transcription service.
- Hardcoded English route behavior removed.
- `/voice/respond` contract and runtime behavior are aligned to PCM16.
- Related tests enforce contract expectations.

## Definition of Done

- Implementation checklist completed.
- API/services typechecks pass.
- Voice response/transcription test suite updates pass.

## Rollback Plan

- Revert route/service contract changes and restore previous client decode assumptions.
- Keep Voice Mode rollout disabled until contract is revalidated.

## Dependencies

- None

## Unblocks

- P4-I1 Voice Mode MVP (Manual Push-to-Talk)
- P4-I3 Voice Mode Hands-Free Auto Loop
