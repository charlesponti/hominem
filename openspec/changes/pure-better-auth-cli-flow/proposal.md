## Why

The CLI currently completes Better Auth device login but stores credentials that protected API routes do not accept, so successful login does not translate into usable authenticated CLI access. We need one coherent CLI auth contract that uses Better Auth end to end and preserves the existing non-CLI auth paths.

## What Changes

- Route CLI device authorization through stable first-party `/api/auth/device*` endpoints instead of relying on Better Auth's implicit `/device` URL.
- Preserve Better Auth bearer headers on device token exchanges so the CLI can store the Better Auth device-session bearer token directly.
- Update API auth resolution to accept Better Auth bearer tokens for CLI requests before falling back to the legacy custom JWT contract.
- Simplify CLI token storage and lookup around Better Auth bearer sessions instead of custom refresh-token semantics.
- Update CLI auth status and diagnostics so they distinguish between a stored token and a remotely valid authenticated state.

## Capabilities

### New Capabilities
- `cli-auth-device-flow`: Pure Better Auth device authorization and bearer-session auth for CLI callers.

### Modified Capabilities
- `auth-unified-api`: API auth resolution accepts Better Auth bearer tokens alongside the legacy custom JWT contract.

## Impact

- Affected code spans `services/api` auth routes and middleware plus `tools/cli` auth, status, and HTTP client logic.
- Public auth behavior changes for CLI-specific endpoints under `/api/auth/device*`.
- Existing custom `/api/auth/token` and custom JWT issuance remain available for non-CLI callers.
