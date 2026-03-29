# Auth and DB Package State Analysis Report
Generated: 2026-03-29

---

## 1. MIGRATION STATE ANALYSIS

### Latest Migration
- **File**: `20260326182300_enrich_tag_model.sql` (Mar 28, 2026 23:34)
- **Total Migrations**: 22 SQL migrations
- **Initial Auth Migration**: `20260326180300_create_auth_tables.sql`

### Better Auth Core Tables Status

#### Tables Present (✓ COMPLETE)
All Better Auth core tables are properly created and present:

1. **auth.users** (NOT auth.user)
   - Singular table: ✗ NO
   - Plural table: ✓ YES
   - Columns: id (uuid), email, name, avatar_url, email_verified_at, createdAt, updatedAt

2. **auth.sessions** (NOT auth.session)
   - Singular table: ✗ NO
   - Plural table: ✓ YES
   - Columns: id, userId, token_hash, expires_at, revoked_at, state, amr[], auth_level, ip_hash, user_agent_hash, last_seen_at, timestamps

3. **auth.identities** (Better Auth calls this "account")
   - Created as: ✓ YES (auth.identities)
   - Columns: id, userId, provider, provider_account_id, provider_subject, encrypted tokens, scope, timestamps

4. **auth.verification_tokens** (Better Auth "verification")
   - Created as: ✓ YES (auth.verification_tokens)
   - Columns: id, identifier, token_hash, channel, purpose, userId, expires_at, consumed_at, timestamps

5. **auth.passkeys** (Plugin table)
   - Created as: ✓ YES (auth.passkeys)
   - Columns: id, userId, credential_id, public_key, device_type, backed_up, sign_count, transports, friendly_name, aaguid, last_used_at, createdAt

6. **auth.device_codes** (Plugin table)
   - Created as: ✓ YES (auth.device_codes)
   - Columns: id, device_code, user_code, userId, expires_at, status, last_polled_at, polling_interval_seconds, client_id, scope, timestamps

7. **auth.api_keys** (Custom extension)
   - Created as: ✓ YES (auth.api_keys)
   - Columns: id, userId, name, prefix, key_hash, last_used_at, revoked_at, expires_at, timestamps

8. **auth.refresh_tokens** (Better Auth core)
   - Created as: ✓ YES (auth.refresh_tokens)
   - Columns: id, session_id, family_id, parent_id, token_hash, expires_at, used_at, revoked_at, createdAt
   - Note: This is created in auth schema, but NOT referenced in generated types

#### Schema Status
- Schema `auth` created: ✓ YES
- Schema `ops` created: ✓ YES (but used inconsistently)
- Schema `app` created: ✓ YES

---

## 2. LEGACY TABLE NAMES ANALYSIS

### CRITICAL ISSUE: Table Name Mismatch

The codebase has inconsistent table naming conventions across different layers:

#### Migration & Type Definitions (Correct - Plural)
- ✓ `auth.users` (migration, types)
- ✓ `auth.sessions` (migration, types)
- ✓ `auth.identities` (migration, types)
- ✓ `auth.passkeys` (migration, types)
- ✓ `auth.verification_tokens` (migration, types)
- ✓ `auth.refresh_tokens` (migration, types)

#### API Service Code (WRONG - Singular/Custom)
Found in `/services/api/src/auth/session-store.ts`:
- ✗ `auth.session` (should be `auth.sessions`)
- ✗ `auth.user` (should be `auth.users`)
- ✗ `ops.refreshToken` (should be `auth.refresh_tokens`)

#### Service References by File
**File: session-store.ts (6 errors)**
```
Line 66:   .selectFrom('auth.session')         ✗ WRONG
Line 81:   .updateTable('auth.session')        ✗ WRONG
Line 94:   .insertInto('auth.session')         ✗ WRONG
Line 130:  .insertInto('ops.refreshToken')    ✗ WRONG
Line 167:  .updateTable('auth.session')        ✗ WRONG
Line 200:  .selectFrom('auth.session')         ✗ WRONG
Line 226:  .selectFrom('ops.refreshToken')    ✗ WRONG
Line 270:  .selectFrom('auth.session')         ✗ WRONG
Line 281:  .selectFrom('auth.user')            ✗ WRONG
Line 292:  .updateTable('auth.session')        ✗ WRONG
Line 368:  .selectFrom('ops.refreshToken')    ✗ WRONG
```

**File: auth.ts (3 errors)**
```
Line 318:  .selectFrom('auth.user')            ✗ WRONG
Line 419:  .selectFrom('auth.passkey')         ✗ WRONG (singular)
Line 659:  .selectFrom('auth.user')            ✗ WRONG
```

**File: status.ts (1 error)**
```
Line 13:   .selectFrom('auth.user')            ✗ WRONG
```

**File: session-store.test.ts (1 error)**
```
Line 33:   .selectFrom('auth.session')         ✗ WRONG
```

#### Auth Package (Correct - Plural)
✓ `packages/auth/src/user-auth.service.ts`: Uses `auth.users` (CORRECT)
✓ `packages/auth/src/account.service.ts`: Uses `auth.identities` (CORRECT)

### Missing Tables in Database Types
- `ops.refreshToken` / `ops.refresh_tokens` - **NOT CREATED**
- Migrations created `auth.refresh_tokens` (in auth schema)
- But API code references `ops.refreshToken` (ops schema, wrong case, wrong location)

---

## 3. GENERATED DB TYPES STATE

### Type Generation Command
```bash
npm run codegen  # Uses kysely-codegen
```

### Database Types File
**Location**: `/packages/db/src/types/database.ts` (833 lines)

### Auth-Related Types Present
All properly defined with correct naming:
- ✓ `AuthUsers` → mapped to `"auth.users"`
- ✓ `AuthSessions` → mapped to `"auth.sessions"`
- ✓ `AuthIdentities` → mapped to `"auth.identities"`
- ✓ `AuthPasskeys` → mapped to `"auth.passkeys"`
- ✓ `AuthVerificationTokens` → mapped to `"auth.verification_tokens"`
- ✓ `AuthRefreshTokens` → mapped to `"auth.refresh_tokens"`
- ✓ `AuthApiKeys` → mapped to `"auth.api_keys"`
- ✓ `AuthDeviceCodes` → mapped to `"auth.device_codes"`

### Type Gaps/Mismatches
1. **`ops.refreshToken` MISSING**
   - API code references: `ops.refreshToken`
   - Created in migration: `auth.refresh_tokens`
   - Mapped in types as: `"auth.refresh_tokens"`
   - Result: Runtime queries to non-existent table will fail

2. **Table Naming Convention**
   - Migrations use snake_case: `auth.refresh_tokens`, `auth.device_codes`
   - Database generated types use snake_case correctly
   - API code uses camelCase: `ops.refreshToken`, `auth.session` (WRONG)

---

## 4. CUSTOM SESSION/REFRESH TOKEN SYSTEMS

### Current State: HYBRID SYSTEM

The API has implemented a **CUSTOM session and refresh token system** that runs ALONGSIDE Better Auth:

#### Location
**Directory**: `/services/api/src/auth/`

**Files**:
- `session-store.ts` - Custom session creation, revocation, caching
- `tokens.ts` - JWT access token generation/verification
- `key-store.ts` - Signing key management
- `types.ts` - Token claim types
- `better-auth.ts` - Better Auth configuration

#### Custom System Details

**1. Custom Session Management** (`session-store.ts`)
- Creates sessions in `auth.session` (table doesn't exist)
- Manages session state in Redis + Database
- Supports session revocation with replay detection
- Family-based refresh token rotation
- Session expiry: 30 days (REFRESH_TTL_SECONDS)

**2. Custom JWT Access Token** (`tokens.ts`)
- Algorithm: ES256 (ECDSA with SHA-256)
- TTL: 10 minutes (ACCESS_TOKEN_TTL_SECONDS)
- Claims:
  ```
  {
    sub: userId,
    sid: sessionId,
    scope: ["api:read", "api:write"],
    role: "user" | "admin",
    amr: ["email_otp", "better-auth-session", ...],
    auth_time: epoch,
    iss: ISSUER,
    aud: AUDIENCE,
    jti: unique-id
  }
  ```

**3. Refresh Token Family Rotation**
- Uses `ops.refreshToken` table (non-existent)
- Family ID tracking for replay detection
- Parent-child chain for rotation
- Marks tokens as used to detect replays
- Revokes entire family on replay detection

**4. Redis Caching Layer**
- Caches session state with TTLs
- Keys: `auth:session:sid:{sessionId}`
- Keys: `auth:revoked:sid:{sessionId}`
- Fallback to database if Redis unavailable

#### Functions Exported
```typescript
// Session management
export async function revokeSession(sessionId: string)
export async function isSessionRevoked(sessionId: string)
export async function rotateRefreshToken(refreshToken: string)

// Token creation
export async function createTokenPairForUser(input)
export async function createE2eTokenPairForUser(input)

// Token revocation
export async function revokeByRefreshToken(refreshToken: string)
```

#### Custom Auth Endpoints
**File**: `/services/api/src/routes/auth.ts`

Custom endpoints alongside Better Auth:
- `POST /auth/refresh` - Refresh token endpoint with custom logic
- `POST /auth/token` - Token endpoint integrating custom tokens
- Uses custom `refreshTokenSchema` validation
- Returns access token + refresh token + session info

#### Coexistence with Better Auth
```
┌─────────────────────────────────────────┐
│  Better Auth Server (kyselyAdapter)     │
│  - Manages: users, identities, passkeys │
│  - Plugins: emailOTP, passkey, bearer   │
│  - Sessions: Built-in Better Auth       │
└────────────────────┬────────────────────┘
                     │
     ┌───────────────┴────────────────┐
     │                                 │
     ▼                                 ▼
┌──────────────────┐        ┌─────────────────────┐
│ Better Auth API  │        │ Custom Auth System  │
│ /auth/signin     │        │ - JWT Tokens        │
│ /auth/oauth/*    │        │ - Refresh Rotation  │
│ /auth/passkey    │        │ - Session Caching   │
│ /auth/email-otp  │        │ - Redis Integration │
└──────────────────┘        │ /auth/refresh       │
                            │ /auth/token         │
                            └─────────────────────┘
```

#### Issues with Current System
1. ✗ Custom system creates `auth.session` (doesn't exist)
2. ✗ Custom system references `ops.refreshToken` (doesn't exist)
3. ✗ Custom system references `auth.user` (should be `auth.users`)
4. ✗ Refresh tokens stored in wrong schema/table
5. ✗ Migration-defined `auth.refresh_tokens` not used by custom system
6. ✗ Database types don't match API code references

---

## SUMMARY MATRIX

| Area | Status | Notes |
|------|--------|-------|
| **Migration Completeness** | ✓ COMPLETE | All auth tables created with plural names |
| **Core Tables** | ✓ PRESENT | user, sessions, identities, verification, passkeys, device_codes, api_keys |
| **Type Generation** | ✓ UP-TO-DATE | Kysely types properly reflect schema |
| **Type-Code Alignment** | ✗ BROKEN | API code references singular/camelCase names |
| **Better Auth Integration** | ✓ CONFIGURED | Proper kyselyAdapter setup |
| **Custom Session System** | ✗ BROKEN | References non-existent tables |
| **Custom Refresh Tokens** | ✗ BROKEN | Tables don't exist in correct location |
| **Legacy Names** | ✗ PRESENT | Code uses `auth.session`, `auth.user`, `ops.refreshToken` |

---

## RECOMMENDATIONS

### CRITICAL - Must Fix Immediately
1. **Fix table references in session-store.ts**
   - Replace `auth.session` → `auth.sessions`
   - Replace `auth.user` → `auth.users`
   - Replace `ops.refreshToken` → `auth.refresh_tokens`

2. **Create missing session table or reconcile**
   - Option A: Create `auth.session` (singular) to match code
   - Option B: Update all code to use `auth.sessions` (preferred)

3. **Handle refresh_tokens storage**
   - Currently: `auth.refresh_tokens` exists in migration
   - Code expects: `ops.refreshToken`
   - Recommendation: Use `auth.refresh_tokens` from migration

### Should Fix
1. Ensure database types are regenerated after schema stabilization
2. Add type safety checks to catch plural/singular mismatches
3. Document the custom auth system's relationship to Better Auth
4. Implement integration tests for table operations

### Nice to Have
1. Consolidate into single session system (remove duplication)
2. Consider moving to full Better Auth session management
3. Add migration validation to CI/CD

