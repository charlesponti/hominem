# P2-I3: Inline Migration Cleanup and Modal Retirement

## Linear Fields

- **Title:** `P2-I3 Inline Migration Cleanup and Modal Retirement`
- **Parent:** `Voice I/O Web Rollout`
- **Priority:** `Medium`
- **Labels:** `voice`, `web`, `cleanup`, `phase-2`
- **Blocked By:** `P2-I2`
- **Blocks:** `None`
- **Feature Flag:** `voice_input_inline_enabled`
- **Rollout Strategy:** Ship after inline path proves stable in production

## Description

Retire modal-era voice input debt so inline capture is the clear and maintainable source of truth.

## Problem

After inline capture ships, keeping legacy modal pathways active in primary exports and logic creates maintenance drag, dual-path bugs, and contributor confusion. We need to cleanly retire modal-first behavior while preserving compatibility where still required.

## Solution

Complete migration cleanup in a controlled issue:
- Remove composer dependence on modal flow.
- Deprecate then remove modal exports from active public surfaces where safe.
- Keep migration notes and clear fallback boundaries.

## Implementation Checklist

- [x] Consumer audit.
  - [x] Identify all active references to `ChatVoiceModal` in web path.
  - [x] Confirm no runtime dependency for primary composer flow.

- [x] Cleanup composer path.
  - [x] Remove dead modal toggling/state from composer where fully replaced.
  - [x] Keep inline path as sole source for capture in web composer.

- [x] Export/API cleanup.
  - [x] Deprecate modal export in UI package if any external consumers remain.
  - [x] Remove export when consumers are migrated.

- [x] Documentation cleanup.
  - [x] Update phase docs and implementation status references to reflect final source of truth.
  - [x] Add migration note for any downstream teams depending on modal APIs.

- [x] Regression verification.
  - [x] Ensure no voice input regressions in composer.
  - [x] Ensure no build/type regressions from removed exports.

- [x] Validation commands.
  - [x] `bun run --filter @hominem/ui typecheck`
  - [x] `bun run --filter @hominem/web typecheck`

## Deployability

Independently deployable once inline path is stable. This is a cleanup hardening issue, not a net-new UX issue.

## Acceptance Criteria

- Composer no longer depends on modal flow in active web path.
- Modal export/dependency surface is deprecated or removed as planned.
- No regressions for voice input in web composer.

## Definition of Done

- Implementation checklist completed.
- Consumer audit documented.
- Targeted typechecks pass for affected packages.

## Rollback Plan

- Restore removed export/wiring if downstream consumers unexpectedly break.
- Keep inline path as default while compatibility shim is reintroduced.

## Dependencies

- P2-I2 Inline Confidence UX (Timer + Waveform + State Copy)

## Unblocks

- Reduces risk for P4 issues by removing parallel voice input abstractions.
