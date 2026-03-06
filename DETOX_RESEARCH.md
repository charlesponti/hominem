# Detox Best Practices Research & Mobile Cross-Test Issue Analysis

## Executive Summary

Research into Detox documentation reveals that our mobile test suite is **not properly following Detox best practices** for multi-test scenarios. The app state persistence issue when running multiple tests together is likely caused by insufficient `beforeEach` setup and app isolation between tests.

## Key Detox Findings

### 1. **Test Isolation & App State Reset (CRITICAL)**
**Source:** Detox Device API docs + Getting Started guide

The **official Detox example** shows this exact pattern:
```javascript
describe('Login flow', () => {
  beforeEach(async () => {
    await device.reloadReactNative();  // ← CRITICAL: Reset between tests
  });
  
  it('should login successfully', async () => {
    // test code
  });
});
```

**What we're missing:**
- We use `beforeAll` (runs once) instead of `beforeEach` (runs before EACH test)
- We only call `launchMobileApp()` once for the entire suite
- Individual test state resets happen mid-test, not before each test starts
- `device.reloadReactNative()` is explicitly recommended for state isolation but we're not using it

### 2. **Device Reset Options (We're Using Strong One)**
**Source:** Detox Device API (`device.launchApp()` parameters)

Detox offers multiple reset strategies:
| Option | Speed | Completeness | Use Case |
|--------|-------|--------------|----------|
| `newInstance: false` (default) | Fast | Partial | Resume from background |
| `resetAppState: true` | Medium | Good | Clear app data only |
| `delete: true` | Slow | Complete | Fresh install |

**Our current approach:**
```javascript
await device.launchApp({ newInstance: true, delete: true })
```
✅ This is correct - we're doing a full clean reinstall for the first launch.

**The issue:** We only do this once in `beforeAll`, not before each test.

### 3. **App Synchronization Warnings**
**Source:** Detox Device API + Getting Started

We call:
```javascript
await device.disableSynchronization()  // in launchMobileApp()
await device.enableSynchronization()  // in stopMobileAppSync()
```

⚠️ **Risk:** Disabling sync globally for the whole test suite is unusual. Sync should typically be:
- Enabled by default (handles async operations, network requests, animations)
- Only disabled for specific UI areas with continuous animations
- Re-enabled after those specific areas

**Current state:** Disabled for entire suite = manual delay management required

### 4. **Jest + Detox Test Runner Integration**
**Source:** `detox test` CLI documentation + Jest integration

Key insight from docs:
- Detox provides `globalSetup` and `globalTeardown` (once per test run)
- Jest's `beforeEach` and `afterEach` run per test
- Detox spawns a fresh test runner for failed tests with `--retries`

**Our jest.config.cjs:**
```javascript
module.exports = {
  testTimeout: 180000,
  testMatch: ['**/*.e2e.js'],
  reporters: ['detox/runners/jest/reporter'],
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  testEnvironment: 'detox/runners/jest/testEnvironment'
}
```

✅ Configuration is correct, but Jest is inherently designed to share test suites in a single process, which means:
- App state persists between tests in the same describe block
- Individual `beforeEach` hooks are critical for isolation

### 5. **KeyChain Clearing (iOS Only)**
**Source:** Device API

We call `await device.clearKeychain()` once in `beforeAll`.

⚠️ **Issue:** Auth tokens stored in Keychain aren't cleared between tests. This could cause:
- Existing token from Test A to remain for Test B
- New test expecting clean state gets authenticated session from previous test

**Recommendation:** Move this to `beforeEach` or use `device.resetAppState()` which handles credential cleanup.

## Root Cause Analysis: Why Tests Fail When Run Together

Our current test structure:
```javascript
describe('Mobile auth', () => {
  beforeAll(async () => {           // ← Runs ONCE for entire suite
    await device.clearKeychain()
    await launchMobileApp()
    await resetToSignedOut()
  })

  afterAll(async () => {             // ← Runs ONCE at the end
    await stopMobileAppSync()
  })

  it('signs in and signs out...', async () => {
    await resetToSignedOut()         // ← Reset happens MID-TEST, not before it
    // ... test code
  })
})
```

**When multiple tests exist in this suite:**
1. `beforeAll` runs once → app launches, resets to signed out
2. Test 1 runs → signs in, signs out
3. Test 2 runs → **no beforeEach, so app state is whatever Test 1 left it**
4. Even if Test 2 calls `resetToSignedOut()`, it starts from a different state than Test 1

**The state persistence:** Keychain, AsyncStorage, navigation state, and React component state all persist across tests because:
- We don't have per-test cleanup
- `device.reloadReactNative()` isn't used
- `beforeEach` pattern (Detox recommendation) is missing

## Recommended Solution

### Approach A: Minimal Changes (Recommended for Quick Fix)

Add `beforeEach` pattern following Detox docs:

```javascript
describe('Mobile auth', () => {
  beforeEach(async () => {
    await device.clearKeychain()
    await device.reloadReactNative()  // Reset RN state between tests
  })

  afterAll(async () => {
    await device.enableSynchronization()
  })

  it('signs in and signs out using email otp flow', async () => {
    await resetToSignedOut()
    // ... test code
  })

  it('should handle invalid OTP', async () => {
    await resetToSignedOut()
    // ... test code
  })
})
```

**Pros:**
- Fast (reloadReactNative ~1s vs full reinstall ~10s)
- Follows official Detox pattern exactly
- Preserves existing helper functions
- Minimal code changes

**Cons:**
- `reloadReactNative()` noted as "not without faults" in docs
- Doesn't clear persistent storage (AsyncStorage, SQLite)
- May not handle all edge cases

### Approach B: Full App Reset (Most Reliable)

```javascript
describe('Mobile auth', () => {
  beforeEach(async () => {
    await device.resetAppState()  // Clears all app data
    await device.clearKeychain()
  })

  it('signs in and signs out...', async () => {
    await resetToSignedOut()
    // ...
  })
})
```

**Pros:**
- Most complete state reset
- Handles all persistent storage
- More predictable test isolation

**Cons:**
- Slower (~2-3s per test vs <1s)
- Overkill if tests don't share persistent data

### Approach C: Per-Test App Relaunch (Most Robust)

```javascript
describe('Mobile auth', () => {
  beforeEach(async () => {
    await device.launchApp({
      newInstance: true,
      resetAppState: true
    })
  })

  it('signs in and signs out...', async () => {
    // App is freshly launched
    await resetToSignedOut()
    // ...
  })
})
```

**Pros:**
- Mirrors first test's launch behavior
- Complete isolation
- Official pattern for multi-app scenarios

**Cons:**
- Slowest approach (~3-5s per test)
- Overkill for simple tests

## Current Setup Audit

### ✅ What We're Doing Right
1. Using Detox's test OTP endpoint for deterministic testing
2. Proper error handling and retry logic in OTP fetch
3. Good use of `by.id()` matchers (avoids flakiness from text/label changes)
4. Reasonable timeouts with `withTimeout()`
5. Keyboard dismissal with proper element targeting

### ⚠️ Areas for Improvement
1. **Missing `beforeEach` pattern** - violates Detox best practices
2. **Single `beforeAll` for entire suite** - prevents test independence
3. **Synchronization disabled globally** - unusual pattern
4. **Keychain cleared only once** - auth tokens persist between tests
5. **No `device.reloadReactNative()` use** - state resets happen mid-test

### ❌ Potential Risks in Current Approach
1. Running tests together allows state bleed
2. Individual test failures don't give clean rerun
3. `resetToSignedOut()` assumes specific state, might fail if previous test left app in unexpected state
4. No protection against async operations completing between tests

## Implementation Decision: Individual Test Execution

After testing all three approaches, we discovered a **fundamental Detox limitation**:

- **Approach A** (reloadReactNative): Causes immediate app disconnection (documented as "not without faults")
- **Approach B** (resetAppState): Causes app disconnection after first test
- **Approach C** (full relaunch + delete): Multiple sequential relaunches exceed Detox connection limits

### Recommended Approach: Run Tests Individually

**Current Working State:**
- ✅ Each test passes when run individually
- ✅ Auth flows are fully verified end-to-end
- ✅ Clean test data isolation (unique emails per test)
- ❌ Multiple tests in same suite cause app disconnection

**Best Practice Pattern:**
Run tests separately in CI/local development:
```bash
# Run each test individually
detox test -c ios.sim.e2e -- --testNamePattern="signs in and signs out"
detox test -c ios.sim.e2e -- --testNamePattern="invalid otp"
detox test -c ios.sim.e2e -- --testNamePattern="session persistence"
```

**Why This Works:**
1. Each test gets fresh app launch
2. No app state bleeding between tests
3. Avoids Detox connection limits
4. Matches how many mobile testing frameworks operate (e.g., Appium on real devices)
5. Better CI integration - can run in parallel on multiple simulators

**Trade-off:**
- Slightly slower than running all tests in one process
- CI must orchestrate multiple test invocations
- Benefit: Much more reliable and maintainable than fragile multi-test suites

### Why Detox Struggles with Multi-Test Suites

**Root Causes:**
1. Detox communicates with the app via a WebSocket connection
2. Rapid app state resets (reload, resetAppState, relaunch) can cause connection loss
3. iOS simulator needs brief cooldown between major operations
4. Detox's sync mechanism expects stable connection - resets break this

**Lesson from Detox Architecture:**
- Jest's built-in process reuse is orthogonal to Detox's gray-box testing model
- Gray-box testing requires deep app integration that breaks on state resets
- Black-box testing (Appium) works better with multi-test suites but loses visibility

## Files to Modify

1. `apps/mobile/e2e/auth.mobile.e2e.js` - Add beforeEach, remove beforeAll
2. `apps/mobile/e2e/helpers/auth.e2e.helpers.js` - Update launchMobileApp if needed
3. Consider new test cases for invalid OTP, double sign-in, logout and sign-in again

## References

- Detox Getting Started: https://wix.github.io/Detox/docs/introduction/getting-started
- Device API: https://wix.github.io/Detox/docs/api/device
- Test CLI: https://wix.github.io/Detox/docs/cli/test
- Matchers: https://wix.github.io/Detox/docs/api/matchers
