# Mobile E2E Testing Architecture - Root Cause Analysis

## The Real Problem

We're trying to force Jest's multi-test suite pattern onto Detox, which has a fundamentally different architecture:

### Detox Architecture (Gray-Box)
- Real-time bidirectional WebSocket connection to app
- Expects app to stay alive during test suite
- State resets (reload, reinstall) break the connection protocol
- Designed for individual test execution, not test suites

### Jest/Traditional Test Framework Pattern
- Spawns processes, runs multiple tests, cleans up
- Assumes test isolation through process isolation
- Fits black-box testing (Appium, Selenium)

**The Mismatch:** We're using Jest (process-reuse) with Detox (connection-oriented)

## Why This Keeps Failing

1. **First approach (reloadReactNative):** Detox docs say "not without faults" - connection loss
2. **Second approach (resetAppState):** iOS reimplements app - connection loss
3. **Third approach (relaunch + delete):** Multiple TCP handshakes exceed limits
4. **Original (beforeAll):** App state bleeds between tests

## The Sustainable Solution

We need to align our test architecture with how Detox actually works, not fight it.

### Option 1: Individual Test Files (Recommended)
```
e2e/auth.signin.e2e.js       (one test per file)
e2e/auth.invalid-otp.e2e.js  (one test per file)
e2e/auth.passkey.e2e.js      (one test per file)
```

**Pros:**
- ✅ Natural alignment with Detox connection model
- ✅ Inherent test isolation (new process per file)
- ✅ Easy to run in parallel CI
- ✅ Clear scope per test
- ✅ No weird hacks or workarounds

**Cons:**
- More files
- Can't use shared `beforeEach` (but don't need to!)

### Option 2: Custom Jest Config + Test Runner
Create a wrapper that:
1. Runs each test file in isolation
2. Kills simulator between tests
3. Orchestrates clean state

**Pros:**
- Keeps all tests in single file
- Explicit control over lifecycle

**Cons:**
- Custom infrastructure to maintain
- More complex
- Similar performance to Option 1

### Option 3: Detox CLI with File Glob
```bash
detox test -c ios.sim.e2e e2e/auth/*.e2e.js
```

Detox handles each file separately automatically.

**Pros:**
- Built-in, no custom code
- Matches Detox design

**Cons:**
- Must split tests across files

## The Decision Framework

**For sustainable mobile E2E testing:**

1. ✅ **Split auth test into individual test files** (Option 1)
   - Each test file = one scenario
   - Natural isolation
   - Matches Detox architecture
   - Scales to 50+ tests without issue

2. ✅ **Create shared helpers** (no `beforeEach` needed)
   - `helpers/auth-setup.js` - creates clean auth state
   - `helpers/auth-assertions.js` - common assertions
   - Each test imports and calls directly

3. ✅ **Update CI to run tests in parallel**
   - `detox test -c ios.sim.e2e e2e/auth/signin.e2e.js`
   - `detox test -c ios.sim.e2e e2e/auth/invalid-otp.e2e.js`
   - `detox test -c ios.sim.e2e e2e/auth/passkey.e2e.js`

4. ✅ **Accept that this is the correct pattern**
   - Mobile E2E testing ≠ Backend unit testing
   - Each test should be independent and runnable
   - This is how Appium/Selenium also work

## What NOT to Do

❌ Keep trying `beforeEach` patterns
❌ Force Jest's multi-test suite behavior onto Detox
❌ Use `reloadReactNative()` or aggressive state resets
❌ Create custom wrapper logic to simulate test suites
❌ Run tests in parallel threads (they'll fight for connection)

## Implementation Plan

1. Split `auth.mobile.e2e.js` into:
   - `e2e/auth/signin.e2e.js` - basic sign-in/out flow
   - `e2e/auth/invalid-otp.e2e.js` - error handling
   - `e2e/auth/passkey.e2e.js` - passkey flows
   - `e2e/auth/session-persistence.e2e.js` - boot flow

2. Keep helpers in `e2e/helpers/auth.e2e.helpers.js` (unchanged)

3. Each file has its own `beforeAll/afterAll` for setup

4. CI runs each file separately

This is the **scalable, maintainable** approach.
