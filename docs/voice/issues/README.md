# Voice I/O Shippable Issues

This directory contains one Linear-ready doc per independently deployable Voice I/O issue.

## Parent Linear Issue

- **Parent:** `Voice I/O Web Rollout`

## Global Rollout Flags

- `voice_input_inline_enabled`
- `voice_tts_server_enabled`
- `voice_mode_enabled`
- `voice_mode_auto_loop_enabled`

## Phase 1: Foundation
- [P1-I1 Recorder Reliability and State Truth](./p1-i1-recorder-reliability-and-state-truth.md)
- [P1-I2 API Contract Correctness and Language Path](./p1-i2-api-contract-correctness-and-language-path.md)
- [P1-I3 Accessibility and Telemetry Baseline](./p1-i3-accessibility-and-telemetry-baseline.md)

## Phase 2: Inline Voice Input
- [P2-I1 Inline Capture MVP Behind Flag](./p2-i1-inline-capture-mvp-behind-flag.md)
- [P2-I2 Inline Confidence UX (Timer + Waveform + State Copy)](./p2-i2-inline-confidence-ux.md)
- [P2-I3 Inline Migration Cleanup and Modal Retirement](./p2-i3-inline-migration-cleanup.md)

## Phase 3: Server TTS Output
- [P3-I1 Server TTS Hook and Route Integration](./p3-i1-server-tts-hook-and-route-integration.md)
- [P3-I2 Server TTS Stabilization and Fallback Policy](./p3-i2-server-tts-stabilization-and-fallback-policy.md)

## Phase 4: Voice Mode
- [P4-I1 Voice Mode MVP (Manual Push-to-Talk)](./p4-i1-voice-mode-mvp-manual-push-to-talk.md)
- [P4-I2 Voice Mode Safety and Interrupt Controls](./p4-i2-voice-mode-safety-and-interrupt-controls.md)
- [P4-I3 Voice Mode Hands-Free Auto Loop](./p4-i3-voice-mode-hands-free-auto-loop.md)

## Recommended Execution Order

1. P1-I1
2. P1-I2
3. P1-I3
4. P2-I1
5. P2-I2
6. P2-I3
7. P3-I1
8. P3-I2
9. P4-I1
10. P4-I2
11. P4-I3
