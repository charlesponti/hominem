## 1. Server device routes

- [x] 1.1 Configure Better Auth device authorization with a stable `/api/auth/device` verification URI.
- [x] 1.2 Add or update `/api/auth/device*` route wrappers so verify and approve flows are exposed through first-party API routes.
- [x] 1.3 Preserve Better Auth auth headers, including `set-auth-token`, on `/api/auth/device/token` responses.

## 2. API auth resolution

- [x] 2.1 Update protected-route auth middleware to resolve Better Auth bearer sessions before custom JWT validation.
- [x] 2.2 Apply the same Better Auth bearer precedence to `/api/auth/session`, `resolveAuthUserId`, and `resolveAuthSessionId`.
- [x] 2.3 Add API tests covering Better Auth bearer auth, legacy JWT auth, and invalid bearer fallback behavior.

## 3. CLI auth behavior

- [x] 3.1 Update CLI device login to store the Better Auth bearer from `set-auth-token` instead of custom token fields.
- [x] 3.2 Remove CLI refresh-token assumptions for the pure Better Auth path and keep issuer matching intact.
- [x] 3.3 Fix CLI default scope handling, timeout behavior, and interactive verification URL/error reporting.
- [x] 3.4 Update CLI auth status and diagnostics to report `tokenStored` and remotely validated `authenticated` state.

## 4. Verification

- [x] 4.1 Add CLI unit coverage for bearer storage, timeout behavior, and status reporting.
- [x] 4.2 Run focused API and CLI tests plus a live local CLI login/request smoke flow.
