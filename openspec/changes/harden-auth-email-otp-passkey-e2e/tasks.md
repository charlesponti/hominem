## 1. Auth Test Foundation

- [x] 1.1 Define deterministic OTP test retrieval contract and wire test-only plumbing boundary
- [x] 1.2 Build shared auth integration harness utilities (OTP retrieval, session assertions, test identity helpers)
- [x] 1.3 Build shared passkey integration harness utilities (virtual authenticator setup/teardown helpers)
- [x] 1.4 Add auth test environment docs and commands for local/CI (test DB, Redis, required env vars)

## 2. API RED Contract Suites

- [x] 2.1 Add RED integration tests for email OTP request contract (success, invalid input, rate-limit behavior)
- [x] 2.2 Add RED integration tests for OTP verification contract (success, invalid OTP, expired OTP, no session on failure)
- [ ] 2.3 Add RED integration tests for passkey register contract (unauthorized rejection, authenticated success path)
- [ ] 2.4 Add RED integration tests for passkey auth contract (success, malformed assertion failure)
- [ ] 2.5 Add RED integration tests for method-agnostic session-subject mapping (email OTP and passkey)

## 3. Browser RED Auth Journeys

- [ ] 3.1 Add Finance browser integration suite for email OTP journey and logout
- [ ] 3.2 Add Notes browser integration suite for email OTP journey and logout
- [ ] 3.3 Add Rocco browser integration suite for email OTP journey and logout
- [ ] 3.4 Add browser integration cases for passkey enrollment and passkey sign-in
- [ ] 3.5 Add browser integration fallback cases from passkey path to email OTP path

## 4. GREEN API/Auth Core Implementation

- [ ] 4.1 Implement OTP verification completion path needed by app flows and session establishment contract
- [ ] 4.2 Refactor generic session mapping paths to remove provider-hardcoded assumptions
- [ ] 4.3 Align passkey route behavior with contract requirements and error semantics
- [ ] 4.4 Ensure auth middleware/session endpoints consistently represent authenticated state across methods

## 5. GREEN Shared Auth Package Implementation

- [ ] 5.1 Align auth client/provider typing with supported auth methods and remove stale provider constraints
- [ ] 5.2 Standardize shared auth client methods used by apps for OTP/passkey journeys
- [ ] 5.3 Ensure shared auth server utilities preserve consistent auth/session headers and state handling

## 6. GREEN App Route And UX Cutover

- [ ] 6.1 Implement complete email OTP UX flow in Finance (request + verify + authenticated redirect)
- [ ] 6.2 Implement complete email OTP UX flow in Notes (request + verify + authenticated redirect)
- [ ] 6.3 Implement complete email OTP UX flow in Rocco (request + verify + authenticated redirect)
- [ ] 6.4 Add passkey enrollment and passkey sign-in entry points in app auth surfaces
- [ ] 6.5 Standardize auth entry and callback route semantics across all three apps

## 7. No-Shim Cleanup

- [ ] 7.1 Remove in-scope legacy/duplicate auth flow branches replaced by the new contract
- [ ] 7.2 Remove alias/wrapper/dual-path auth logic introduced as temporary compatibility patterns
- [ ] 7.3 Verify no provider-specific assumptions remain in generic auth/session resolution paths

## 8. Final Verification Gates

- [ ] 8.1 Run auth-focused API integration suites and fix remaining failures
- [ ] 8.2 Run app browser auth integration suites and fix remaining failures
- [ ] 8.3 Run monorepo check gates (`bun run validate-db-imports`, `bun run test`, `bun run typecheck`, `bun run check`)
- [ ] 8.4 Record final verification evidence and update change artifacts for apply/close readiness
