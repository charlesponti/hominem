## Verification Log

### 2026-03-10

#### 3.1 API auth contract suites

- Command: `bun run --filter @hominem/api test:auth`
- Result: passing
- Coverage confirmed:
  - email OTP request, valid verify, invalid verify, expired verify, replay rejection
  - refresh grant contract and camelCase refresh input
  - mobile E2E bootstrap guardrails
  - auth rate-limit coverage
  - test OTP retrieval route

#### 3.2 Status gate ownership and re-verification

- Configured `API_URL` in this workspace: `http://localhost:4040`
- Command: `curl -fsS http://localhost:4040/api/status`
- Result:

```json
{"status":"ok","serverTime":"2026-03-10T08:09:15.785Z","uptime":60.4011255,"database":"connected"}
```

- Local status route test: `cd services/api && NODE_ENV=test bunx vitest run src/routes/status.test.ts`
- Result: passing

#### Ownership disposition

- `/api/status` is app-owned for:
  - API process liveness
  - database reachability from the API process
- `/api/status` is not the owner for:
  - external Redis readiness
  - third-party auth provider availability
  - container orchestration or platform routing health outside the API process

#### Sign-off note

- For this local environment, there are no unresolved sign-off-blocking `5xx` responses on `/api/status`.
- Broader deployed-environment status ownership remains bounded to the same app-owned responsibilities above.

#### 3.3 Web auth integration coverage

- Command: `bun run --filter @hominem/finance test:e2e -- tests/auth.email-otp.spec.ts`
- Result: passing
- Coverage confirmed:
  - Finance email OTP happy path reaches `/finance`
  - Finance invalid OTP stays on verify route and shows the expected error path

- Command: `bun run --filter @hominem/finance test:e2e -- tests/auth.passkey.spec.ts`
- Result: passing with one explicit skip
- Coverage confirmed:
  - Finance OTP fallback from the auth entry route
  - passkey management surfaces render after auth
  - boot persistence and session-expiry request propagation
- Disposition:
  - `web passkey registration and sign-in flow reaches authenticated finance view` remains skipped in this environment
  - Root cause is still unresolved Better Auth browser-session parity after test-store OTP sign-in
  - Follow-up experiments confirmed the configured Better Auth verification/session models point at tables such as `userVerification` and `userSession` that are not present in the current DB shape, so a test-only cookie bootstrap was not safe to keep

- Command: `bun run --filter @hominem/notes test:e2e -- tests/auth.spec.ts`
- Result: passing
- Coverage confirmed:
  - Notes fallback from optional passkey entry to OTP
  - Notes OTP happy path reaches `/notes`
  - Notes invalid OTP stays on verify route and shows the expected error
  - Notes passkey enrollment controls render after auth

- Command: `bun run --filter @hominem/rocco test:e2e -- tests/auth.spec.ts`
- Result: passing
- Coverage confirmed:
  - Rocco fallback from optional passkey entry to OTP
  - Rocco OTP happy path reaches `/visits`
  - Rocco invalid OTP stays on verify route and shows the expected error
  - Rocco passkey enrollment controls render after auth
