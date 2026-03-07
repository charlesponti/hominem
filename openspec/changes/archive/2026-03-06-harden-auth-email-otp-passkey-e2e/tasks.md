## 1. Auth Test Foundation

- [x] 1.1 Define deterministic OTP test retrieval contract and wire test-only plumbing boundary
- [x] 1.2 Build shared auth integration harness utilities (OTP retrieval, session assertions, test identity helpers)
- [x] 1.3 Build shared passkey integration harness utilities (virtual authenticator setup/teardown helpers)
- [x] 1.4 Add auth test environment docs and commands for local/CI (test DB, Redis, required env vars)

## 2. Auth Unit And Integration Safety Net

- [x] 2.1 Add unit tests for auth validation/helpers/state transitions in shared auth code
- [x] 2.2 Add mobile screen/integration tests for email entry, OTP verify, resend, loading, and error states
- [x] 2.3 Add integration tests for passkey prompt visibility, skip behavior, and fallback to OTP
- [x] 2.4 Add integration tests for signed-in/signed-out shell transitions and auth redirects

## 3. API RED Contract Suites

- [x] 3.1 Add RED integration tests for email OTP request contract (success, invalid input, rate-limit behavior)
- [x] 3.2 Add RED integration tests for OTP verification contract (success, invalid OTP, expired OTP, no session on failure)
- [x] 3.3 Add RED integration tests for passkey register contract (unauthorized rejection, authenticated success path)
- [x] 3.4 Add RED integration tests for passkey auth contract (success, malformed assertion failure)
- [x] 3.5 Add RED integration tests for method-agnostic session-subject mapping (email OTP and passkey)

## 4. Browser RED Auth Journeys

- [x] 4.1 Add Finance browser integration suite for email OTP journey and logout
- [x] 4.2 Add Notes browser integration suite for email OTP journey and logout
- [x] 4.3 Add Rocco browser integration suite for email OTP journey and logout
- [x] 4.4 Add browser integration cases for passkey enrollment and passkey sign-in
- [x] 4.5 Add browser integration fallback cases from passkey path to email OTP path

## 5. Mobile Device E2E Critical Paths

- [x] 5.1 Add one mobile device test for email + OTP success path with fresh app state per test
- [x] 5.2 Add one mobile device test for invalid OTP rejection / unauthenticated persistence
- [x] 5.3 Add one mobile device test for session restore after terminate/relaunch
- [x] 5.4 Add one mobile device test for passkey happy path or passkey fallback, whichever provides the highest native-confidence signal first
- [x] 5.5 Ensure mobile device tests are thin, independent, and do not share app state across specs

## 6. GREEN API/Auth Core Implementation

- [x] 6.1 Implement OTP verification completion path needed by app flows and session establishment contract
- [x] 6.2 Refactor generic session mapping paths to remove provider-hardcoded assumptions
- [x] 6.3 Align passkey route behavior with contract requirements and error semantics
- [x] 6.4 Ensure auth middleware/session endpoints consistently represent authenticated state across methods

## 7. GREEN Shared Auth Package Implementation

- [x] 7.1 Align auth client/provider typing with supported auth methods and remove stale provider constraints
- [x] 7.2 Standardize shared auth client methods used by apps for OTP/passkey journeys
- [x] 7.3 Ensure shared auth server utilities preserve consistent auth/session headers and state handling

## 8. GREEN App Route And UX Cutover

- [x] 8.1 Implement complete email OTP UX flow in Finance (request + verify + authenticated redirect)
- [x] 8.2 Implement complete email OTP UX flow in Notes (request + verify + authenticated redirect)
- [x] 8.3 Implement complete email OTP UX flow in Rocco (request + verify + authenticated redirect)
- [x] 8.4 Add passkey enrollment and passkey sign-in entry points in app auth surfaces
- [x] 8.5 Standardize auth entry and callback route semantics across all three apps

## 9. No-Shim Cleanup

- [x] 9.1 Remove in-scope legacy/duplicate auth flow branches replaced by the new contract
- [x] 9.2 Remove alias/wrapper/dual-path auth logic introduced as temporary compatibility patterns
- [x] 9.3 Verify no provider-specific assumptions remain in generic auth/session resolution paths

## 10. Final Verification Gates

- [x] 10.1 Run auth-focused unit, integration, and contract suites and fix remaining failures
- [x] 10.2 Run app browser and mobile device auth suites and fix remaining failures
- [x] 10.3 Run monorepo check gates (`bun run validate-db-imports`, `bun run test`, `bun run typecheck`, `bun run check`)
- [x] 10.4 Record final verification evidence and update change artifacts for apply/close readiness
