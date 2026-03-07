# Single Auth Path Architecture

Date: 2026-03-06

## Problem Statement

The current authentication system conflates two separate concerns:

1. **Identity** – "Who are you?" (authentication)
2. **Credentials** – "What tokens can you use?" (authorization)

This leads to:
- Dual-path endpoints that sometimes mint tokens, sometimes return identity
- Unclear responsibility boundaries between Better Auth and API JWT
- Intermittent failures when Better Auth sessions become unavailable
- Different authentication flows for mobile, web, and CLI clients

## Current (Broken) Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ CLIENTS (Mobile, Web, CLI)                                  │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   ┌────▼───┐     ┌──────▼──────┐  ┌─────▼────┐
   │ Email  │     │  Passkey    │  │  API Key │
   │ + OTP  │     │  (WebAuthn) │  │  (CLI)   │
   └────┬───┘     └──────┬──────┘  └─────┬────┘
        │                │               │
        └────────────────┼───────────────┘
                         │
                    ┌────▼──────────────┐
                    │ Better Auth       │
                    │ (Browser Cookies) │
                    └────┬──────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
    ┌───▼──────┐   ┌─────▼────────┐  ┌───▼──────────┐
    │ Mobile   │   │ Web Browser  │  │ CLI          │
    │ App      │   │ (Cookies OK) │  │ (No Cookies) │
    └───┬──────┘   └─────┬────────┘  └───┬──────────┘
        │                │               │
        │          ┌──────▼──────────┐   │
        │          │ /api/auth/session   │
        │          │ (CONFUSING!)    │   │
        │          │                 │   │
        │          │ Sometimes:      │   │
        │          │ - Returns user  │   │
        │          │ - Mints tokens  │   │
        │          │ - Returns null  │   │
        │          │ when unavailable│   │
        │          └──────┬──────────┘   │
        │                 │               │
        └─────────────────┼───────────────┘
                          │
                    ┌─────▼──────────┐
                    │ Protected RPC  │
                    │ Endpoints      │
                    │                │
                    │ ???            │
                    │ What auth      │
                    │ should work?   │
                    └────────────────┘
```

**Problems with this flow:**

1. `/api/auth/session` has dual responsibility:
   - Path 1: If middleware already has `user` + `auth`, issue a NEW token
   - Path 2: Try to resolve Better Auth session and mint token from it
   - Path 3: Return null if Better Auth unavailable
   
2. **Intermittent failure**: When Better Auth session is stale or unavailable, mobile gets `{ isAuthenticated: false, accessToken: null }` and throws "Unable to mint API..."

3. **No clear contract**: Mobile doesn't know if it should:
   - Call `/api/auth/session` after OTP verify
   - Call it again later to refresh
   - Store the returned token or use cookies

4. **Not scalable to CLI**: No way for CLI tools to get tokens; API Key path exists but isn't integrated into the same flow

---

## Correct (New) Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ ALL CLIENTS (Mobile, Web, CLI)                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                    ┌────▼─────┐
                    │ Step 1:   │
                    │ SIGN IN   │
                    └────┬─────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   ┌────▼───┐     ┌──────▼──────┐  ┌─────▼────┐
   │ Email  │     │  Passkey    │  │  API Key │
   │ + OTP  │     │  (WebAuthn) │  │  (CLI)   │
   └────┬───┘     └──────┬──────┘  └─────┬────┘
        │                │               │
        └────────────────┼───────────────┘
                         │
                    ┌────▼──────────────────┐
                    │ Better Auth           │
                    │ (Identity Provider)   │
                    └────┬──────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
        │ POST /api/auth/[method]/verify  │
        │ - email-otp/verify              │
        │ - passkey/verify                │
        │ - api-key/verify                │
        │                                 │
        │ Returns:                        │
        │ {                               │
        │   user,                         │
        │   accessToken (short-lived),    │
        │   refreshToken (long-lived),    │
        │   expiresIn                     │
        │ }                               │
        └────────┬────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
    ┌───▼──┐      ┌──────▼──────┐    ┌────▼─────┐
    │Mobile│      │   Web       │    │   CLI    │
    │ App  │      │ (Browser)   │    │ Scripts  │
    │      │      │             │    │          │
    │Store:│      │Store:       │    │Store:    │
    │-Token│      │-Cookies     │    │-Env File │
    │-Secure      │-localStorage│    │-Keyring  │
    └───┬──┘      └──────┬──────┘    └────┬─────┘
        │                │               │
        └────────────────┼───────────────┘
                         │
                    ┌────▼──────────────┐
                    │ Protected API     │
                    │ Endpoints         │
                    │                   │
                    │ Header:           │
                    │ Authorization:    │
                    │ Bearer {token}    │
                    │                   │
                    │ Middleware:       │
                    │ - Validate token  │
                    │ - Extract user ID │
                    │ - Set c.get('auth')
                    └─────────────────┘
                    
                         │ If 401 (expired)
                         │
                    ┌────▼──────────────┐
                    │ POST /api/auth/   │
                    │ refresh           │
                    │                   │
                    │ Returns:          │
                    │ {                 │
                    │   accessToken,    │
                    │   refreshToken,   │
                    │   expiresIn       │
                    │ }                 │
                    └────────────────────┘
```

**Benefits of this flow:**

1. **Single sign-in contract**: All clients use the same `/api/auth/[method]/verify` endpoint
2. **Clear separation of concerns**:
   - Sign-in endpoints issue credentials
   - Protected endpoints validate credentials
   - `/api/auth/session` returns identity only (optional)
3. **Deterministic**: Sign-in always returns tokens; session is never used to mint credentials
4. **Works for all clients**: Mobile, web, and CLI all follow the same token-based pattern
5. **Refresh is universal**: All clients use `POST /api/auth/refresh` with the same contract

---

## API Contracts

### Sign-In Endpoints (Client-Specific Methods)

All return the same credential structure.

#### Email + OTP (Mobile & Web)

```typescript
POST /api/auth/email-otp/verify
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456",
  "name": "User Name"  // optional, used on first sign-in
}

Response (200):
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "createdAt": "2026-03-06T...",
    "updatedAt": "2026-03-06T..."
  },
  "accessToken": "eyJ...",      // Short-lived (15 min)
  "refreshToken": "base64url...", // Long-lived (30 days)
  "expiresIn": 900               // 15 minutes in seconds
}
```

#### Passkey (Mobile & Web)

```typescript
POST /api/auth/passkey/verify
Content-Type: application/json

{
  "response": { /* WebAuthn assertion response */ }
}

Response (200):
{
  "user": { ... },
  "accessToken": "eyJ...",
  "refreshToken": "base64url...",
  "expiresIn": 900
}
```

#### API Key (CLI & Service Accounts)

```typescript
POST /api/auth/api-key/verify
Content-Type: application/json

{
  "apiKey": "hom_xxxxxxxxxxxx"
}

Response (200):
{
  "user": { ... },
  "accessToken": "eyJ...",
  "refreshToken": "base64url...",
  "expiresIn": 900
}
```

### Token Refresh (All Clients)

```typescript
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "base64url..."
}

Response (200):
{
  "accessToken": "eyJ...",
  "refreshToken": "base64url...",  // May be rotated
  "expiresIn": 900
}

Response (401):
{
  "error": "invalid_refresh_token",
  "message": "Refresh token expired or revoked. Sign in again."
}
```

### Session Endpoint (Optional, Identity-Only)

**Only used by web clients to check identity; NOT for credentialing.**

```typescript
GET /api/auth/session
Authorization: Bearer {accessToken}

Response (200):
{
  "isAuthenticated": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "createdAt": "2026-03-06T...",
    "updatedAt": "2026-03-06T..."
  }
  // NO accessToken or refreshToken here
}

Response (401):
{
  "isAuthenticated": false,
  "user": null
}
```

---

## Client-Specific Implementation

### Mobile (iOS)

**Sign In:**
```typescript
const response = await fetch('/api/auth/email-otp/verify', {
  method: 'POST',
  body: JSON.stringify({ email, otp, name })
});
const { user, accessToken, refreshToken, expiresIn } = await response.json();

// Store both tokens
await SecureStore.setItemAsync('accessToken', accessToken);
await SecureStore.setItemAsync('refreshToken', refreshToken);
await SecureStore.setItemAsync('tokenExpiresAt', Date.now() + expiresIn * 1000);
```

**Make API Call:**
```typescript
const token = await SecureStore.getItemAsync('accessToken');
const response = await fetch('/api/protected/notes', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

**Refresh Token:**
```typescript
const refreshToken = await SecureStore.getItemAsync('refreshToken');
const response = await fetch('/api/auth/refresh', {
  method: 'POST',
  body: JSON.stringify({ refreshToken })
});
const { accessToken, refreshToken: newRefreshToken, expiresIn } = await response.json();

// Update storage
await SecureStore.setItemAsync('accessToken', accessToken);
await SecureStore.setItemAsync('refreshToken', newRefreshToken);
```

### Web (Browser)

**Sign In:**
```typescript
const response = await fetch('/api/auth/email-otp/verify', {
  method: 'POST',
  credentials: 'include',  // Include cookies
  body: JSON.stringify({ email, otp, name })
});
const { user, accessToken, refreshToken, expiresIn } = await response.json();

// Store tokens locally
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);
localStorage.setItem('tokenExpiresAt', Date.now() + expiresIn * 1000);
```

**Make API Call:**
```typescript
const token = localStorage.getItem('accessToken');
const response = await fetch('/api/protected/notes', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### CLI (Scripts/Tools)

**Sign In:**
```bash
curl -X POST https://api.hominem.test/api/auth/api-key/verify \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "hom_xxxxxxxxxxxx"}'

# Response:
# {
#   "accessToken": "eyJ...",
#   "refreshToken": "base64url...",
#   "expiresIn": 900
# }
```

**Store and Use Token:**
```bash
# Store in environment or .env file (or better: use `pass` or system keyring)
export HOMINEM_ACCESS_TOKEN="eyJ..."

# Make API call
curl -X GET https://api.hominem.test/api/protected/notes \
  -H "Authorization: Bearer ${HOMINEM_ACCESS_TOKEN}"
```

---

## Protected Endpoint Middleware

All protected endpoints follow this pattern:

```typescript
// Middleware that runs before route handler
app.use('/api/protected/*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'missing_auth_header' }, 401);
  }
  
  const token = authHeader.slice(7);
  
  try {
    const claims = await verifyAccessToken(token);
    
    // Extract user info from token claims
    const user = await db.query.users.findFirst({
      where: eq(users.id, claims.sub)
    });
    
    if (!user) {
      return c.json({ error: 'user_not_found' }, 401);
    }
    
    // Set on context for route handler to use
    c.set('userId', user.id);
    c.set('auth', claims);
    
  } catch (error) {
    if (error.message.includes('expired')) {
      return c.json({ error: 'token_expired' }, 401);
    }
    return c.json({ error: 'invalid_token' }, 401);
  }
  
  await next();
});

// Now any route under /api/protected/* can use c.get('userId')
app.get('/api/protected/notes', (c) => {
  const userId = c.get('userId');
  // ...
});
```

---

## Key Architectural Rules

1. **No dual-path auth**
   - ❌ `/api/auth/session` must not mint tokens
   - ✅ Only sign-in endpoints mint credentials

2. **Identity and credentials are separate**
   - ❌ Don't return `accessToken` from identity endpoints
   - ✅ Sign-in returns credentials; session returns identity

3. **All protected endpoints require Bearer token**
   - ❌ Don't accept cookies for protected RPC
   - ✅ All clients send `Authorization: Bearer {token}` header

4. **Refresh is universal**
   - ❌ Don't have client-specific refresh paths
   - ✅ All clients POST to `/api/auth/refresh` with same contract

5. **Tokens are minted at sign-in time only**
   - ❌ Don't try to auto-mint in middleware
   - ✅ Tokens come from sign-in or refresh endpoints

6. **No implicit token derivation**
   - ❌ Don't try to derive API token from Better Auth session
   - ✅ Better Auth handles identity; credentials come from sign-in

---

## Migration Path

### Phase 1: Separate Concerns
1. Remove token minting logic from `/api/auth/session`
2. Make `/api/auth/session` identity-only
3. Ensure sign-in endpoints return complete credential structure

### Phase 2: Update Mobile
1. Update mobile to store both `accessToken` and `refreshToken` after sign-in
2. Remove calls to `/api/auth/session` for token minting
3. Use Bearer token for all protected API calls
4. Implement refresh token logic for 401 responses

### Phase 3: Update Web
1. Update web to use same token structure
2. Remove any implicit cookie-based auth from protected endpoints
3. Make web use Bearer tokens like mobile

### Phase 4: Add CLI Support
1. Implement `/api/auth/api-key/verify` endpoint
2. Document CLI authentication workflow
3. Update API client libraries to support API key auth

---

## Benefits

- ✅ Single authentication path for all clients
- ✅ Clear responsibility boundaries
- ✅ Deterministic behavior (no intermittent failures)
- ✅ Scalable to new client types (CLI, service accounts, etc.)
- ✅ Follows OAuth 2.0 refresh token pattern
- ✅ Works with mobile's secure storage requirements
- ✅ No special-case middleware logic
- ✅ Easy to test and debug
