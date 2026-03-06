# iOS Passkey Device Test Plan

This checklist defines the minimum requirements before we add a passkey-native mobile device test.

## Goal

Add exactly one reliable iOS device-level passkey scenario that proves native/system-mediated auth behavior without introducing flaky CI.

## Choose One Initial Scenario

- Preferred first option: passkey fallback or cancel path
- Alternate option: passkey happy path sign-in

Start with whichever is more deterministic on iOS simulator for this app/runtime.

## Preconditions

- [ ] Confirm Expo runtime and Better Auth passkey flow behave consistently on the chosen iOS simulator
- [ ] Confirm the simulator/device has passkey-capable credential support enabled
- [ ] Confirm the app can reach the API and token exchange path during the scenario
- [ ] Confirm the test environment has deterministic user setup and cleanup

## Deterministic Setup Strategy

- [ ] Decide how the user gets a passkey before the test starts
- [ ] Prefer API or seeded setup over UI-driven enrollment when possible
- [ ] If UI enrollment is required, define it as a separate setup step, not hidden inside unrelated auth tests
- [ ] Ensure the test can start from fresh app state every time

## System UI Strategy

- [ ] Document the expected iOS system dialogs for the scenario
- [ ] Decide what Detox can actually observe versus what must be inferred from app state
- [ ] Avoid relying on brittle text selectors inside system-owned surfaces
- [ ] Define timeout and retry expectations explicitly

## Assertions

- [ ] Validate the app transitions to the expected auth state
- [ ] Validate fallback returns the user to a retryable OTP/email path when passkey is cancelled or unavailable
- [ ] Validate no stale signed-in state leaks across app relaunches
- [ ] Validate token exchange completes when the passkey scenario succeeds

## CI Readiness

- [ ] Confirm the scenario passes locally multiple times in a row
- [ ] Confirm the scenario passes on the GitHub macOS runner profile used by Detox
- [ ] Capture logs/artifacts on failure
- [ ] Add the scenario to the critical auth suite only after it is stable

## Exit Criteria

We can promote the passkey device test into the critical auth suite only when:

- it passes repeatedly without manual intervention
- it does not depend on hidden simulator state
- it has a documented setup path
- failures clearly indicate app/auth problems rather than random system UI timing
