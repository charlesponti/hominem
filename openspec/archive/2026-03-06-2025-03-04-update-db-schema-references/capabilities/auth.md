# Auth Capability Modernization

## Testing Standard (Locked)
- Every "Required RED tests" item in this file is a DB-backed integration slice test by default.
- Tests must execute real service/query paths against the test DB and assert both flow outcome and guard invariants.
- Unit tests are allowed only for isolated pure logic and must not replace capability integration coverage.

## AUTH-01 Identity Resolution And User Mapping
### Capability ID and entry points
- ID: `AUTH-01`
- Entry points:
  - `packages/auth/src/user-auth.service.ts`
  - `packages/auth/src/user.ts`
  - `packages/auth/src/account.service.ts` (identity resolution helpers)

### Current inputs/outputs + guards
- Inputs: user IDs, provider identifiers, Better Auth user/account rows.
- Outputs: normalized hominem user shape and linked identity tuples.
- Guards: partial ownership checks via linked user lookup; inconsistent null handling.

### Current failure modes
- Mixed snake_case/camelCase mapping errors.
- Silent null returns where explicit typed failures are required.
- Inconsistent linkage when `betterAuthUserId` is missing.

### Modernization review
- Bottlenecks:
  - Mapping logic duplicated across files.
  - Identity lookup and relink path not centralized.
- Refactor options:
  - A) Keep helper functions per file.
  - B) Central `IdentityLinkService` + typed mapper module.
  - C) Push mapping into route handlers.
- Selected modern contract: **B**
  - Single typed identity resolver with deterministic `resolveOrFail`.
  - Canonical mapper for user/account DTO conversion.
- Rejected options:
  - A rejected due to continued drift.
  - C rejected due to leaky layering.

### Final target contract
- `resolveIdentity(userId: string): Promise<{ domainUserId: string; authUserId: string }>`
- Throws typed `NotFoundError|ConflictError|InternalError`; never ambiguous null.

### Required RED tests
- Resolves by domain id when linked.
- Resolves by auth id fallback and links when unlinked.
- Fails deterministically on missing both sides.
- Rejects cross-tenant linkage mutation.

### Required GREEN tasks
- Build identity resolver service.
- Replace ad hoc resolver branches.
- Adopt canonical mapper.

### Legacy files/imports to delete
- Duplicated identity helper blocks in `packages/auth/src/account.service.ts`.

## AUTH-02 Provider Account Lifecycle
### Capability ID and entry points
- ID: `AUTH-02`
- Entry points:
  - `packages/auth/src/account.service.ts`

### Current inputs/outputs + guards
- Inputs: provider id/account id, token payload fields.
- Outputs: compatibility account records.
- Guards: provider uniqueness implied, not uniformly enforced.

### Current failure modes
- Update/create semantics diverge across providers.
- Partial updates can null fields unintentionally.

### Modernization review
- Bottlenecks:
  - Separate create/update logic with repeated field transforms.
- Refactor options:
  - A) Keep imperative CRUD branches.
  - B) Upsert-first repository with immutable key fields.
  - C) Route-level raw DB writes.
- Selected modern contract: **B**
- Rejected options: A and C for inconsistency and layering issues.

### Final target contract
- `upsertProviderAccount(input): Promise<AccountRecord>`
- Unique key `(authUserId, providerId, accountId)`.
- Patch contract forbids key mutation.

### Required RED tests
- Idempotent upsert on same provider account.
- Conflict on attempting key mutation.
- Ownership guard on delete/update by non-owner.

### Required GREEN tasks
- Build repository-level upsert.
- Remove mutable key update paths.

### Legacy files/imports to delete
- Legacy mutable update branches in `packages/auth/src/account.service.ts`.

## AUTH-03 Server Session Verification
### Capability ID and entry points
- ID: `AUTH-03`
- Entry points:
  - `packages/auth/src/server.ts`
  - `services/api/src/routes/auth.ts`

### Current inputs/outputs + guards
- Inputs: request headers/cookies/token payload.
- Outputs: authenticated context or null.
- Guards: route-local checks vary by endpoint.

### Current failure modes
- Divergent auth behavior between API endpoints.
- Inconsistent token/session error mapping.

### Modernization review
- Bottlenecks:
  - Multiple verification paths.
- Refactor options:
  - A) Keep per-route auth checks.
  - B) Unified verifier + middleware contract.
  - C) Late validation in handlers.
- Selected modern contract: **B**

### Final target contract
- Single verification pipeline:
  - `verifyRequestAuth(req) -> AuthContext`
  - Standard error mapping `401/403`.

### Required RED tests
- Valid token/session accepted.
- Expired/invalid token rejected with `401`.
- Authenticated but unauthorized route rejected with `403`.

### Required GREEN tasks
- Consolidate verifier path.
- Route adoption of unified middleware.

### Legacy files/imports to delete
- Endpoint-specific duplicate verifier blocks in `services/api/src/routes/auth.ts`.

## AUTH-04 OAuth, Mobile, CLI, Passkey Flows
### Capability ID and entry points
- ID: `AUTH-04`
- Entry points:
  - `services/api/src/routes/auth.ts`

### Current inputs/outputs + guards
- Inputs: auth provider callbacks, mobile/cli exchange codes, passkey payloads.
- Outputs: redirect or token/session payload.
- Guards: flow state and replay checks implemented but spread across route code.

### Current failure modes
- Flow logic mixed with HTTP orchestration.
- Harder to reason about replay/expiration guarantees.

### Modernization review
- Bottlenecks:
  - Monolithic route file and mixed concerns.
- Refactor options:
  - A) Keep all logic in route file.
  - B) Extract flow services per transport (oauth/mobile/cli/passkey).
  - C) Temporary wrappers around current handlers.
- Selected modern contract: **B**

### Final target contract
- Dedicated service modules:
  - `OAuthFlowService`, `MobileFlowService`, `CliFlowService`, `PasskeyFlowService`.
- Route handlers become thin transport adapters.

### Required RED tests
- Replay attempts rejected.
- Expired flow rejected.
- Successful exchange returns expected token/session envelope.

### Required GREEN tasks
- Extract flow services and typed interfaces.
- Convert route file to adapter-only handlers.

### Legacy files/imports to delete
- In-route flow orchestration blocks in `services/api/src/routes/auth.ts`.
