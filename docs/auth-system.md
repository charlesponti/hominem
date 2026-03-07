# Authentication System Documentation

## Overview

Hominem uses [Better Auth](https://www.better-auth.com/) as its authentication framework, with additional plugins for passkeys, email OTP, and OAuth providers. This document outlines all authentication methods, API endpoints, and user flows.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Client Apps                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│  │   Notes     │  │   Rocco     │  │   Finance   │  │     Mobile      │   │
│  │  (port 4445)│  │  (port 4446)│  │  (port 4444)│  │   (Expo Go)    │   │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘   │
│         │                │                │                    │             │
│         └────────────────┴────────────────┴────────────────────┘             │
│                                    │                                        │
│                          VITE_PUBLIC_API_URL                                │
│                                    │                                        │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API Server                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    /api/better-auth/* (Better Auth)                  │  │
│  │   - sign-in/email-otp    - sign-in/social (OAuth)                   │  │
│  │   - passkey/*             - email-otp/*                             │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    /api/auth/* (Custom Routes)                     │  │
│  │   - /session    - /token    - /refresh-token    - /logout           │  │
│  │   - /passkey/*  - /link/*   - /mobile/*        - /cli/*            │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Database (PostgreSQL)                             │
│  - betterAuthUser        - betterAuthSession     - betterAuthAccount       │
│  - betterAuthPasskey     - betterAuthVerification                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Authentication Methods

### 1. Email OTP (One-Time Password)

**Use Case:** Primary authentication method for local development and users without other providers.

**User Flow:**
1. User visits `/auth/email` on any app
2. User enters email address
3. System sends 6-digit OTP to user's email
4. User enters OTP on verification page
5. System creates session and redirects to app

**API Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/better-auth/sign-in/email-otp` | POST | Request OTP code |
| `/api/better-auth/email-otp/verify-otp` | POST | Verify OTP and create session |
| `/api/better-auth/email-otp/send-verification-otp` | POST | Resend OTP |

**Request/Response:**
```typescript
// POST /api/better-auth/sign-in/email-otp
Request: { "email": "user@example.com", "callbackURL": "http://localhost:4445" }
Response: { "success": true }

// POST /api/better-auth/email-otp/verify-otp  
Request: { "email": "user@example.com", "otp": "123456" }
Response: { "session": { "token": "...", "expiresAt": "..." }, "user": {...} }
```

**Environment Variables Required:**
- `RESEND_API_KEY` - Resend API key for sending emails
- `RESEND_FROM_EMAIL` - Sender email address (e.g., `auth@hominem.dev`)
- `RESEND_FROM_NAME` - Sender display name (e.g., "Hominem")

---

### 2. Passkey (WebAuthn)

**Use Case:** Fast, passwordless authentication using biometrics or hardware keys. Works on localhost without public URL requirements.

**User Flow:**
1. User clicks "Sign in with Passkey" 
2. Browser prompts for biometric/hardware key
3. System verifies credential and creates session
4. User is redirected to app

**API Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/passkey/auth/options` | POST | Generate authentication options |
| `/api/auth/passkey/auth/verify` | POST | Verify passkey response |
| `/api/auth/passkey/register/options` | POST | Generate registration options |
| `/api/auth/passkey/register/verify` | POST | Verify and save passkey |

**Client Implementation:**
```typescript
// Using @simplewebauthn/browser
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';

// Authenticate
const authOptions = await fetch('/api/auth/passkey/auth/options', { method: 'POST' }).then(r => r.json());
const authResult = await startAuthentication(authOptions);
await fetch('/api/auth/passkey/auth/verify', {
  method: 'POST',
  body: JSON.stringify({ response: authResult })
});
```

---

### 3. OAuth (Apple, Google)

**Use Case:** Social sign-in for production use.

**User Flow:**
1. User clicks "Sign in with Apple" or "Sign in with Google"
2. Redirects to provider's OAuth flow
3. Provider redirects back to `/auth/callback`
4. System creates session and redirects to app

**API Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/authorize` | GET | Initiate OAuth flow (proxies to better-auth) |
| `/api/auth/callback/apple` | GET | Apple OAuth callback |
| `/api/auth/callback/google` | GET | Google OAuth callback |

**Environment Variables:**
- `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET` - Apple Developer credentials
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google Cloud credentials

---

### 4. Mobile Authentication (iOS/Android)

**Use Case:** Native mobile apps using secure token exchange.

**User Flow:**
1. App opens, initiates OAuth with Apple
2. Mobile Safari opens OAuth page
3. User authenticates with provider
4. App receives callback with auth code
5. App exchanges code for tokens via API

**API Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/mobile/authorize` | POST | Start mobile OAuth flow |
| `/api/auth/mobile/callback` | GET | Handle OAuth callback |
| `/api/auth/mobile/exchange` | POST | Exchange code for tokens |

**Token Response:**
```typescript
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "session_id": "uuid",
  "refresh_family_id": "uuid"
}
```

---

### 5. CLI Authentication

**Use Case:** Command-line tools needing API access.

**User Flow:**
1. User runs `hominem login` 
2. CLI opens local browser for OAuth
3. User authenticates
4. CLI receives tokens via redirect

**API Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/cli/authorize` | POST | Start CLI OAuth flow |
| `/api/auth/cli/callback` | GET | Handle OAuth callback |
| `/api/auth/cli/exchange` | POST | Exchange code for tokens |

---

## Session Management

### Getting Current Session

**Endpoint:** `GET /api/auth/session`

```typescript
// Response (authenticated)
{
  "isAuthenticated": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "image": "https://...",
    "isAdmin": false,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  },
  "auth": {
    "sub": "uuid",
    "sid": "session-uuid",
    "scope": ["api:read", "api:write"],
    "role": "user",
    "amr": ["oauth"],
    "authTime": 1234567890
  },
  "accessToken": "eyJ...",
  "expiresIn": 3600
}

// Response (not authenticated)
{
  "isAuthenticated": false,
  "user": null,
  "auth": null,
  "accessToken": null,
  "expiresIn": null
}
```

### Token Refresh

**Endpoint:** `POST /api/auth/token`

```typescript
Request: { "grant_type": "refresh_token", "refresh_token": "..." }
Response: {
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "session_id": "uuid",
  "refresh_family_id": "uuid"
}
```

### Logout

**Endpoint:** `POST /api/auth/logout`

```typescript
Request: {} // No body needed, uses session cookie
Response: { "success": true }
```

---

## Account Linking

Users can link multiple authentication methods to a single account.

### Link Google Account

**Endpoint:** `POST /api/auth/link/google/start`

Query params: `?redirect_uri=https://app.com/account`

Response: 302 redirect to Google's OAuth flow

### Check Link Status

**Endpoint:** `GET /api/auth/link/google/status`

```typescript
Response: { "isLinked": true | false }
```

### Unlink Account

**Endpoint:** `POST /api/auth/link/google/unlink`

```typescript
// May require passkey step-up verification first
Response: { "success": true }
```

---

## User Touch Points

### Pages

| Path | App | Description |
|------|-----|-------------|
| `/auth/email` | All | Email OTP sign-in |
| `/auth/google` | Notes | Sign in with Google |
| `/auth/callback` | All | OAuth callback handler |
| `/account` | All | Account settings (view linked accounts, manage passkeys) |

### Mobile Deep Links

| Scheme | Path | Description |
|--------|------|-------------|
| `hakumi://` | `/auth/callback` | iOS OAuth callback |
| `hakumi-dev://` | `/auth/callback` | iOS Dev OAuth callback |

---

## Environment Configuration

### Required Variables

```bash
# API Server (services/api/.env)
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=https://api.hominem.dev
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=auth@hominem.dev
RESEND_FROM_NAME=Hominem

# OAuth Providers (optional)
APPLE_CLIENT_ID=...
APPLE_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# App Frontends (apps/*/.env)
VITE_PUBLIC_API_URL=http://localhost:4040  # Development
VITE_PUBLIC_API_URL=https://api.hominem.dev # Production
```

### Trusted Origins

Better Auth is configured to trust these origins:
- `http://localhost:3000` (API server)
- `http://localhost:4444` (Finance app)
- `http://localhost:4445` (Notes app)
- `http://localhost:4446` (Rocco app)
- `https://notes.hominem.dev`
- `https://rocco.hominem.dev`
- `https://finance.hominem.dev`
- Mobile app schemes: `hakumi://`, `hakumi-dev://`, `exp://`

---

## Security Considerations

1. **Session Tokens:** HttpOnly, Secure cookies with SameSite=Lax
2. **Rate Limiting:** Applied to authorize, token refresh, and OTP endpoints
3. **Step-Up Auth:** Passkey verification required for sensitive actions (e.g., unlinking Google)
4. **Email Verification:** OTP expires after 5 minutes
5. **Multi-Session:** Users can have up to 8 active sessions

---

## Database Schema

Key Better Auth tables:
- `betterAuthUser` - User accounts
- `betterAuthSession` - Active sessions
- `betterAuthAccount` - Linked OAuth accounts
- `betterAuthPasskey` - Registered passkeys
- `betterAuthVerification` - Email verification tokens
- `betterAuthOneTimeToken` - OTP tokens

See `@hominem/db/schema/tables` for full schema definitions.
