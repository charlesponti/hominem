## Performance Validation (2026-03-06)

## Targets

- Startup auth-state indicator visible in <= 6000ms on iOS simulator.
- Auth sign-in/sign-out flow <= 12000ms in mobile e2e environment.
- Focus list smoothness target: no user-visible stutter in baseline scrolling path.

## Measurements

1. Startup indicator latency (Detox smoke)
- Command: `bun run --filter @hominem/mobile test:e2e:smoke`
- Baseline run: `5314 ms` (`Mobile smoke: resolves to an auth state contract indicator`)
- Post-change run: `5410 ms` (`Mobile smoke: resolves to an auth state contract indicator`)
- Delta: `+96 ms` (+1.8%)
- Status: Pass (<= 6000ms target)

2. Auth flow latency (Detox mobile auth)
- Command: `bun run --filter @hominem/mobile test:e2e:auth:mobile`
- Baseline run: `8935 ms` (`Mobile auth: signs in and signs out using email otp flow`)
- Post-change run: `9223 ms` (`Mobile auth: signs in and signs out using email otp flow`)
- Delta: `+288 ms` (+3.2%)
- Status: Pass (<= 12000ms target)

3. Chat interaction latency (integration contract benchmark)
- Command: `bunx vitest run --config vitest.config.ts tests/integration/chat-contract.integration.test.ts --reporter=verbose`
- Benchmark scenario: `applies optimistic send then reconciles to server messages`
- Baseline run: `8 ms`
- Post-change run: `5 ms`
- Delta: `-3 ms` (-37.5%)
- Status: Pass (no regression; faster than baseline)

4. Focus scrolling benchmark
- Command: `bunx vitest run --config vitest.config.ts tests/integration/focus-contract.integration.test.ts --reporter=verbose`
- Benchmark scenario: `keeps focus traversal benchmark within performance threshold`
- Baseline run: `3 ms` (suite duration `161 ms`)
- Post-change run: `4 ms` (suite duration `169 ms`)
- Delta: `+1 ms` (+33.3%)
- Status: Pass (`< 20 ms` threshold)

## Notes

- First auth e2e run failed due local API not running on `localhost:4040`; after bringing up infra and API, rerun passed.
- These measurements are simulator-based and intended as repeatable regression checks in local dev.
