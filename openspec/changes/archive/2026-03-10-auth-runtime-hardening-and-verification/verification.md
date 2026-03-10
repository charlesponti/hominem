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
- Result: passing
- Coverage confirmed:
  - Finance passkey registration and sign-in reaches `/finance`
  - Finance OTP fallback from the auth entry route
  - passkey management surfaces render after auth
  - boot persistence and session-expiry request propagation
- Fixes applied before re-run:
  - Better Auth table and field mappings now target the existing snake_case auth schema
  - email OTP verify now establishes the Better Auth browser session required by passkey enrollment
  - client-safe redirect/error helpers no longer import server-only logger code during auth page hydration
  - passkey capability detection now re-evaluates after client mount so the `/auth` entry route renders the passkey button in-browser

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

#### 3.4 Mobile Detox auth coverage

- Command: `bun run --cwd apps/mobile test:e2e:auth:critical`
- Result: passing
- Coverage confirmed:
  - mobile email OTP sign-in and sign-out flow
  - invalid OTP rejection without signed-in state
  - signed-in session restore after cold start
  - deterministic passkey sign-in survives relaunch
  - passkey cancel falls back cleanly to signed-out auth entry

#### 3.5 Optional personal-device smoke evidence

- Result: no new personal-device smoke artifact captured in this workspace session
- Reason:
  - this environment provided simulator-based Detox coverage, not a paired personal iOS device lane
  - repo guidance already treats device evidence as optional and outside the required closeout path
- Existing device-lane references retained:
  - [apps/mobile/tests/PASSKEY_DEVICE_PLAN.md](/Users/charlesponti/Developer/hominem/apps/mobile/tests/PASSKEY_DEVICE_PLAN.md)
  - [apps/mobile/tests/TESTING.md](/Users/charlesponti/Developer/hominem/apps/mobile/tests/TESTING.md)
  - [2026-03-09-comprehensive-auth-mobile-implementation.md](/Users/charlesponti/Developer/hominem/docs/plans/2026-03-09-comprehensive-auth-mobile-implementation.md)
- Disposition:
  - required mobile verification is satisfied by the passing Detox auth lane
  - a future personal-device run can attach install/auth smoke notes without reopening the required engineering gate

#### 4.1 Engineering criteria disposition

- Owner approval/disposition source: active implementation session on 2026-03-10
- Engineering criteria marked complete:
  - deterministic mobile bootstrap and refresh handling
  - guarded non-production E2E bootstrap behavior
  - redirect allowlist enforcement and normalized callback contracts across Finance, Notes, and Rocco
  - OTP replay rejection with security logging
  - passkey step-up enforcement for `passkey.register`, `passkey.delete`, and `finance.account.delete`
  - API auth contract verification
  - live `/api/status` verification with ownership boundaries documented
  - web auth integration verification across Finance, Notes, and Rocco
  - mobile Detox auth verification
- Explicitly outside required engineering completion path:
  - personal-device smoke evidence remains optional
  - broader operational sign-off artifacts, readiness matrices, rotation drills, and incident/runbook work were intentionally removed from this engineering-scoped change
- Closeout note:
  - no remaining open engineering criteria were identified in the scoped capabilities for this change

#### 4.2 Required gate summary

- API auth gate: passing
  - source: `bun run --filter @hominem/api test:auth`
- Live status gate: passing
  - source: `curl -fsS http://localhost:4040/api/status`
  - source: `NODE_ENV=test bunx vitest run src/routes/status.test.ts`
- Web auth gate: passing
  - source: Finance OTP and passkey suites
  - source: Notes auth suite
  - source: Rocco auth suite
- Mobile auth gate: passing
  - source: `bun run --cwd apps/mobile test:e2e:auth:critical`
- Verification outcome:
  - all required API, live, web, and mobile auth gates recorded above are green for this change

#### 4.3 Operational follow-up disposition

- Separate follow-up required: no new follow-up created from this implementation session
- Reason:
  - broader operational sign-off work was intentionally removed from this engineering-scoped change before implementation
  - no newly discovered operational blocker remained after the required auth gates passed
- Residual note:
  - if the team still wants readiness matrices, key rotation drills, audit retention mapping, or incident/runbook deliverables, that work should be proposed as a separate operations-focused change rather than reopening this engineering change
