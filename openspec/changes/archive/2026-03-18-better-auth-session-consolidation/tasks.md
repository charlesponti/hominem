## 1. Auth flow audit and design alignment

- [x] 1.1 Inventory all first-party web and mobile sign-in, refresh, bootstrap, and logout paths that currently depend on `hominem_*` cookies or custom token exchange.
- [x] 1.2 Confirm which existing endpoints remain true non-app bearer-token or device-client requirements and document the callers that need them.

## 2. Web Better Auth session consolidation

- [x] 2.1 Update email OTP and passkey completion routes in `services/api` and shared web auth helpers to establish first-party sessions through Better Auth only.
- [x] 2.2 Refactor `packages/auth` server/client helpers and shared UI auth routes to resolve authenticated state from Better Auth sessions instead of `hominem_*` cookies.
- [x] 2.3 Update web logout and session recovery flows across Notes, Finance, and Rocco to clear and restore Better Auth sessions consistently.

## 3. Mobile Better Auth session consolidation

- [x] 3.1 Refactor mobile auth bootstrap, persisted session recovery, and sign-out to use Better Auth-managed session storage instead of custom access/refresh tokens.
- [x] 3.2 Remove passkey session-to-token exchange from the default mobile sign-in path and complete passkey auth directly into the shared session model.
- [x] 3.3 Preserve or isolate any E2E-only mobile bootstrap helpers so they do not define production session behavior.

## 4. API auth simplification and verification

- [x] 4.1 Add or adapt API auth middleware/session resolution so first-party app requests authenticate through Better Auth session state.
- [x] 4.2 Narrow any remaining custom token endpoints and cookie handling to explicit non-browser or machine-client use cases.
- [x] 4.3 Update API, web, and mobile auth tests to assert Better Auth session persistence, reload recovery, and logout behavior.

## 5. Post-consolidation auth hardening

- [x] 5.1 Remove first-party dependence on bearer-shaped session payloads from `/api/auth/session`, and update Notes web, desktop, and mobile auth helpers to treat Better Auth session state as the runtime source of truth.
- [x] 5.2 Fix Notes web auth continuation and guard behavior so `next` survives landing, OTP, passkey, change-email, and protected data-route flows.
- [x] 5.3 Harden logout semantics across shared auth, desktop, and mobile so local signed-out state does not claim success when Better Auth session invalidation fails.
- [x] 5.4 Improve mobile boot and session-expiry behavior so transient network or timeout failures surface a deterministic retryable auth-recovery state instead of silently becoming signed-out.
- [x] 5.5 Clarify CLI machine-client auth behavior by aligning base-url defaults, issuer validation, and logout messaging with the documented device-code token model.
