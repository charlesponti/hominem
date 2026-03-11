## Why

With the parity foundation now defined, feature work should focus on implementing the thought-to-artifact experience one capability at a time rather than re-deciding product structure. The next change should deliver the concrete features that make the system feel like a ChatGPT x Notion product on top of the strict shared contract.

## What Changes

- Build assistant features on top of the dedicated `assistant-thought-lifecycle-foundation` change.
- Treat voice input, full-screen voice mode, note capture, artifact browsing, and AI note actions as capabilities within the shared thought lifecycle contract.
- Implement the home, session, and artifact features incrementally across both surfaces after the foundation is locked.

## Capabilities

### New Capabilities

- `assistant-thought-lifecycle`: Provides assistant thought-to-artifact features that run on top of the parity foundation shared by the mobile app and Notes app.

### Modified Capabilities

None.

## Impact

- Affected code: mobile home and session surfaces, Notes home, session, and artifact surfaces, shared hooks, audio flows, AI note actions, and parity-focused tests.
- Affected systems: mobile assistant UX, Notes UX, thought capture, artifact persistence, audio handling, and accessibility behavior.
