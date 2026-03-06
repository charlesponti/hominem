## iOS Physical Validation Log (2026-03-06)

## Scope

- Device class: physical iOS hardware (manual smoke path).
- Detox remains simulator-only in current project setup (`ios.sim.e2e`).
- Contract under validation: email + OTP auth, protected-route bootstrap, chat/focus tab reachability.

## Observed Issues And Fixes

1. OAuth auth endpoints still being called by mobile app
- Symptom: API logs showed `/api/auth/authorize?...provider=apple` callback attempts during mobile auth flows.
- Impact: invalid callback/state errors and non-deterministic sign-in behavior.
- Fixes shipped:
  - Removed OAuth auth route bridges from API auth surface.
  - Removed mobile OAuth callback utility/tests.
  - Updated auth client surfaces to reject OAuth sign-in/linking with explicit disabled errors.
  - Updated docs/tasks to lock auth scope to email+OTP + passkey.

2. Dev DB migration target conflict with Homebrew Postgres defaults
- Symptom: local migration automation targeted `localhost:5432`, while project Docker dev DB is exposed on `5434`.
- Impact: migrations could apply to wrong server; app DB stayed stale.
- Fixes shipped:
  - Updated root `Makefile` `DEV_DATABASE_URL` default to `postgres://postgres:postgres@localhost:5434/hominem`.
  - Re-ran `make db-migrate` against Docker dev DB.

3. Missing auth/status tables in active dev database
- Symptom: API logs showed `relation "user_verification" does not exist` during OTP send.
- Impact: OTP auth flow failed in live local runs.
- Fixes shipped:
  - Applied migrations on the correct dev DB (`make db-migrate`).
  - Verified `user_verification` now exists.
  - Re-ran `bun run test:e2e:auth:live:local` with all checks passing.

## Post-Fix Validation Evidence

- `bun run test:e2e:auth:live:local` => pass
- `bun run --filter @hominem/mobile test:e2e:auth:mobile` => pass
- `bun run --filter @hominem/mobile test` => pass

## Remaining Manual Step

- Execute physical iOS smoke pass on connected device:
  - sign in via email+OTP
  - verify protected navigation opens after sign-in
  - sign out and verify return to signed-out contract
- Record outcome here, then mark task `9.1` complete.
