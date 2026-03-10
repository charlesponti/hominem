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
