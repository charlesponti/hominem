## Performance Validation (2026-03-06)

## Targets

- Startup auth-state indicator visible in <= 6000ms on iOS simulator.
- Auth sign-in/sign-out flow <= 12000ms in mobile e2e environment.
- Focus list smoothness target: no user-visible stutter in baseline scrolling path.

## Measurements

1. Startup indicator latency (Detox smoke)
- Command: `bun run --filter @hominem/mobile test:e2e:smoke`
- Result: `5314 ms` (`Mobile smoke: resolves to an auth state contract indicator`)
- Status: Pass (<= 6000ms target)

2. Auth flow latency (Detox mobile auth)
- Command: `bun run test:e2e:auth:mobile`
- Result: `8935 ms` (`Mobile auth: signs in and signs out using email otp flow`)
- Status: Pass (<= 12000ms target)

3. Focus scrolling benchmark
- Status: Pending
- Reason: no dedicated automated focus-scroll profiler is currently wired in this change.

## Notes

- First auth e2e run failed due local API not running on `localhost:4040`; after bringing up infra and API, rerun passed.
- These measurements are simulator-based and intended as repeatable regression checks in local dev.
