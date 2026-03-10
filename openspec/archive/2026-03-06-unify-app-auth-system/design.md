## Context

### Current State

Authentication across Hominem apps is fragmented:

- **Mobile** (`apps/mobile`): Uses email OTP with a custom `auth-provider.tsx`. Recently refactored to use single-path token model, but still has custom state machine, routes, and component structure.

- **Finance** (`apps/finance`): Has `/auth/email`, `/auth/email/verify`, `/auth/signin`, `/auth/callback`. Uses legacy callback pattern and mixes Better Auth session assumptions with API token expectations.

- **Notes** (`apps/notes`): Has `/auth/email`, `/auth/callback`. Sends OTP but uses separate verification flow.

- **Rocco** (`apps/rocco`): Same pattern as Notes.

- **Shared UI** (`packages/ui`): Has `EmailSignIn` component and `useApiClient` hook, but assumes different auth context shape than mobile.

- **API** (`services/api`): Already has the correct single-path contracts (`/api/auth/email-otp/verify` returns `accessToken` + `refreshToken`), but apps don't consistently use them.

- **Passkey bridge gap**: Passkey flows currently establish Better Auth identity/session state, but do not consistently mint the canonical Hominem app token pair. This makes passkey success behavior different from OTP success behavior, especially on mobile.

### Constraints

- Must maintain backward compatibility for existing users where possible.
- Cannot change database schema as part of this change.
- Must work on iOS (mobile) and modern browsers (web).
- Must support email OTP and passkeys as the only end-user auth methods.
- No third-party OAuth as primary sign-in path for apps.

### Stakeholders

- Mobile app users (iOS)
- Web app users (finance, notes, rocco)
- Developers maintaining auth code

## Goals / Non-Goals

**Goals:**

1. One canonical auth lifecycle model shared by all first-party apps
2. Consistent route structure across web apps (`/auth`, `/auth/verify`, `/auth/logout`, `/settings/security`)
3. Consistent screen structure across mobile apps (`/(auth)/index`, `/(auth)/verify`)
4. Single token model: `accessToken` (short-lived) + `refreshToken` (long-lived, rotating)
5. Unified boot flow: deterministic, loop-free, uses refresh token as persistent session
6. Shared component contract between web and mobile
7. Email OTP as primary entry, passkey as secondary + post-sign-in enrollment
8. Identical sign-in completion contract for OTP and passkey on web and mobile

**Non-Goals:**

1. Third-party OAuth as primary app sign-in
2. CLI auth redesign (document how it fits the model, but don't rebuild)
3. Organization/admin auth system changes
4. Database schema redesign
5. Visual redesign outside auth surfaces

## Architecture Overview

Authentication in first-party apps SHALL be split into two layers:

```text
auth factor -> identity proof -> app session issuance -> app runtime session

email OTP      Better Auth        Hominem token pair      accessToken + refreshToken
passkey        Better Auth        Hominem token pair      accessToken + refreshToken
```

- **Better Auth** is the identity engine. It validates OTPs, passkeys, and maintains plugin-specific session/challenge continuity.
- **Hominem app tokens** are the application session engine. They authorize protected API calls, boot flow, refresh flow, and route guards.
- **Apps** must treat OTP and passkey as equivalent sign-in methods that converge on the same app-session contract.

This separation is the key architectural rule for the unified system.

## Decisions

### D1: Single Auth State Machine

**Decision:** Define one canonical auth state machine used by both web and mobile.

```typescript
type AuthStatus =
  | 'booting'        // App initializing, checking stored credentials
  | 'signed_out'     // No valid session, showing auth entry
  | 'requesting_otp' // Sending OTP to email
  | 'otp_requested'  // OTP sent, showing code entry
  | 'verifying_otp'  // Verifying OTP code
  | 'authenticating_passkey' // Passkey authentication in progress
  | 'refreshing_session' // Refreshing access token
  | 'signed_in'      // Valid session, protected content accessible
  | 'signing_out'    // Cleaning up session
  | 'degraded';      // Auth error, user can retry
```

**Rationale:** A single state machine prevents divergent behavior between platforms. Mobile already has a similar structure; web apps need one.

**Alternatives Considered:**
- Separate state machines per platform: Rejected — leads to behavioral drift.
- Use Better Auth's internal state: Rejected — Better Auth is the identity provider, not the app session model.

### D2: Route Naming Convention

**Decision:** Web apps use `/auth` (entry) and `/auth/verify` (code entry). Mobile uses `/(auth)/index` and `/(auth)/verify`.

**Rationale:** Consistent naming helps users recognize auth flows. Mobile uses route groups for auth vs. protected areas.

**Alternatives Considered:**
- Keep existing `/auth/email`, `/auth/email/verify`: Rejected — inconsistent naming.
- Use `/login`: Rejected — "sign in" or "continue" is more modern than "login".

### D3: Token Storage Strategy

**Decision:**
- **Mobile**: `refreshToken` in `SecureStore`, `accessToken` in memory. Optional: cache encrypted access token for cold boot optimization.
- **Web**: `refreshToken` in `HttpOnly Secure SameSite=Lax` cookie, `accessToken` in memory only.

**Rationale:** Each platform has different security requirements. Mobile has secure storage; web must use HttpOnly cookies to prevent XSS extraction.

**Alternatives Considered:**
- Store access token on mobile disk: Rejected — increases attack surface without benefit (access tokens are short-lived anyway).
- Use localStorage on web: Rejected — vulnerable to XSS.

### D4: Boot Flow

**Decision:**
- **Web**: On load, check memory for valid access token. If missing/expired, call `/api/auth/refresh` using refresh cookie. If refresh fails, redirect to `/auth`.
- **Mobile**: On load, read refresh token from SecureStore. If access token missing/expired, call `/api/auth/refresh`. If refresh fails, show auth flow.

**Rationale:** This is the simplest persistent session model. Refresh token is the durable credential; access token is ephemeral.

**Alternatives Considered:**
- Rely on Better Auth session cookies in browser: Rejected — mixes identity provider session with app session, causes the original "Unable to mint API" issues.
- Always redirect to auth on boot: Reased — bad UX for returning users.

### D5: Canonical Sign-In Completion Contract

**Decision:** Every successful sign-in method MUST end by issuing the same canonical app token payload:

```typescript
{
  user: { id, email, name? },
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  tokenType: 'Bearer'
}
```

This applies equally to:

- `/api/auth/email-otp/verify`
- `/api/auth/passkey/auth/verify`

**Rationale:** OTP and passkey are different proof mechanisms, not different session models. If one flow returns app tokens and the other only returns Better Auth session state, web and mobile will behave differently and the state machine will diverge.

**Alternatives Considered:**
- Let passkey rely on Better Auth session cookies while OTP uses app tokens: Rejected — creates two runtime auth models.
- Mint tokens later from `/api/auth/session`: Rejected — `/api/auth/session` is identity-only by design.

### D6: Dual-Layer Session Continuity

**Decision:** Apps MAY preserve Better Auth session continuity in parallel with app tokens when required for passkey plugin operations, but Better Auth session state MUST NOT be treated as the primary app session.

This means:

- app route guards, boot flow, and protected API calls use Hominem tokens
- passkey enrollment/list/delete may still require Better Auth session continuity
- sign-in completion still requires canonical token issuance even if Better Auth cookies are also forwarded

**Rationale:** Better Auth passkey plugin endpoints depend on Better Auth session/challenge state. Preserving that state allows enrollment and management features without making Better Auth the app session authority.

**Alternatives Considered:**
- Remove Better Auth session continuity entirely from apps: Rejected for now — would require fully re-implementing passkey management behind Bearer-authenticated app APIs.
- Make Better Auth session the primary app session: Rejected — conflicts with the unified token model and refresh architecture.

### D7: Passkey as Secondary Entry + Post-Sign-In Enrollment

**Decision:**
- Email OTP is the default first-time entry point.
- "Use a passkey" is a secondary CTA on `/auth`.
- After successful OTP sign-in, show non-blocking prompt to enroll passkey.

**Rationale:** This avoids confusing first-run UX while encouraging migration to the best auth method over time.

**Alternatives Considered:**
- Make passkey primary: Rejected — confuses first-time users who don't have a passkey.
- No passkey enrollment prompt: Rejected — users should be prompted to upgrade after proving identity.

### D8: Error Handling

**Decision:** All auth errors show inline (not toast), with precise messages. Generic errors never surface to users.

**Rationale:** Auth errors are security-sensitive; vague messages frustrate users, but detailed technical messages leak information.

**Alternatives Considered:**
- Show detailed errors: Rejected — security risk.
- Show generic "something went wrong": Rejected — not actionable for users.

## Risks / Trade-offs

### Risk: Web Apps Need Migration

**Risk:** Finance, notes, and rocco need route and component migrations.

**Mitigation:** Provide clear migration path in tasks. Existing auth behavior should work until migration is complete.

### Risk: Refresh Token Rotation Complexity

**Risk:** Token rotation on refresh adds complexity. If rotation fails, session is lost.

**Mitigation:** The API already handles rotation in `rotateRefreshToken()`. Apps only need to store the new refresh token returned from `/api/auth/refresh`.

### Risk: Better Auth Session and App Token Drift

**Risk:** Better Auth session continuity and Hominem app tokens may become inconsistent if one is updated without the other.

**Mitigation:** Sign-in endpoints are the single bridge point. Both OTP and passkey sign-in must mint app tokens at sign-in time, and enrollment/management flows must explicitly declare whether they depend on Better Auth session continuity.

### Risk: Passkey Browser Support

**Risk:** Older browsers may not support WebAuthn.

**Mitigation:** Passkey is secondary; email OTP always works. Progressive enhancement — passkey users get faster sign-in.

### Risk: Mobile Cold Boot Performance

**Risk:** Checking stored token on app launch adds latency.

**Mitigation:** Use optimistic UI — show signed-in shell immediately, refresh in background if needed.

## Migration Plan

1. **Phase 1**: Define shared auth state machine and update mobile to use it fully.
2. **Phase 2**: Create shared UI components in `packages/ui` for web auth surfaces.
3. **Phase 3**: Migrate finance to canonical routes (`/auth`, `/auth/verify`).
4. **Phase 4**: Migrate notes and rocco to canonical routes.
5. **Phase 5**: Ensure all apps use the new token storage strategy.
6. **Phase 6**: Make passkey sign-in use the same canonical token issuance contract as OTP.
7. **Phase 7**: Add passkey enrollment prompts and management surfaces on top of that canonical contract.
8. **Phase 8**: Remove legacy routes and transitional auth code from all apps.

Each phase should be testable before moving to the next.

## Open Questions

- Should we create a shared `@hominem/auth-app` package for app auth hooks, or keep them in individual apps with shared component primitives?
- Should `/auth/logout` be a route or an action? (Current: action is cleaner, but route allows direct link.)
- How do we handle session expiry during an active form submission? (Current: block with dialog, don't lose form state.)

## Sequence Diagrams

### Canonical OTP Sign-In

```text
App -> API /email-otp/send
App -> API /email-otp/verify
API -> Better Auth (prove identity)
API -> Hominem token issuer (mint token pair)
API -> App { user, accessToken, refreshToken, expiresIn }
App -> store tokens by platform
App -> signed_in
```

### Canonical Passkey Sign-In

```text
App -> API /passkey/auth/options
API -> Better Auth (challenge options)
API -> App options
App -> Device/WebAuthn prompt
App -> API /passkey/auth/verify
API -> Better Auth (verify passkey assertion)
API -> Hominem token issuer (mint token pair)
API -> App { user, accessToken, refreshToken, expiresIn }
App -> store tokens by platform
App -> signed_in
```

### Post-Sign-In Passkey Enrollment

```text
User signs in with OTP
App already has canonical app tokens
App may also retain Better Auth session continuity
App -> show non-blocking enrollment prompt
User -> Create passkey
App -> API /passkey/register/options
API -> Better Auth (registration challenge)
App -> Device prompt
App -> API /passkey/register/verify
API -> Better Auth (register passkey)
API -> success
App -> show "Passkey created"
```
