## Context

Currently the project has two parallel authentication systems:

1. **Mock Apple Auth** (add-local-mock-auth): A fake Apple Sign-In for local development that creates phantom sessions not connected to the database. This was a workaround because Apple requires public redirect URIs.

2. **Better-Auth with Passkeys**: Real authentication with passkey support already configured in services/api but not fully integrated as the primary auth method in client apps.

The mock auth is no longer needed because passkeys (WebAuthn) work on localhost without requiring redirects. Apple Sign In adds complexity without providing value since passkeys are more secure and work across devices with cloud keychain sync.

## Goals / Non-Goals

**Goals:**
- Remove mock authentication completely (mock.ts, config, environment variables)
- Remove Apple OAuth from better-auth
- Implement Bootstrap pattern: email OTP signup → optional passkey upgrade
- Make passkeys the primary authentication method
- Clean up client code (remove signInWithApple, etc.)

**Non-Goals:**
- Supporting multiple passkeys per user (future enhancement)
- Adding other OAuth providers (Google can be added later if needed)
- Implementing password-based login (passkey + email OTP is sufficient)
- Migrating existing users (this is for new signups)

## Decisions

### Decision 1: Bootstrap Pattern (Email OTP + Passkey)
**Choice**: Use email OTP for initial signup, then prompt to add passkey after login.

**Rationale**:
- Verifies user owns the email before creating account
- Provides recovery mechanism if passkey is lost
- Industry best practice (GitHub, PayPal use this)
- Works on localhost without any special setup

**Alternatives Considered**:
- Direct Passkey Signup: Simpler but risky - no recovery if device lost
- Password + Passkey: Adds complexity, passwords are inferior to passkeys

### Decision 2: Passkey as Optional Upgrade (Not Required)
**Choice**: Prompt to add passkey after email OTP login, but don't require it.

**Rationale**:
- Some users may not have biometric hardware
- Allows gradual adoption
- Email OTP is still a valid recovery path

**Alternatives Considered**:
- Required Passkey: Too restrictive, may block some users

### Decision 3: Remove Mock Auth Completely
**Choice**: Delete all mock auth code rather than disabling it.

**Rationale**:
- Reduces codebase complexity
- Eliminates confusion about which auth is active
- Passkeys work on localhost - mock is no longer needed

**Alternatives Considered**:
- Keep disabled: Just adds dead code to maintain

## Risks / Trade-offs

### [Risk] Users without passkey-capable devices
**Mitigation**: Email OTP provides full authentication capability. Passkey is optional enhancement.

### [Risk] Losing passkey + losing email access
**Mitigation**: This is a known limitation of any email-based system. Users should be warned about this edge case.

### [Risk] Breaking existing signed-in users
**Mitigation**: Existing sessions continue to work. Only new signups use the new flow.

### [Risk] Email deliverability for OTP
**Mitigation**: Use existing email sending infrastructure (already configured in better-auth).

## Migration Plan

1. **Phase 1**: Remove mock auth code (packages/auth/providers/mock.ts, config)
2. **Phase 2**: Update better-auth config to remove Apple
3. **Phase 3**: Update client auth to use email OTP + passkey
4. **Phase 4**: Update UI to show passkey upgrade prompt
5. **Phase 5**: Clean up environment variables

**Rollback**: Revert git changes - no database migrations needed for auth config changes.

## Open Questions

1. Should we keep Apple available as an option but disabled? (Decision: No, remove entirely)
2. How soon after login should we prompt for passkey? (On first login, with recurring prompt)
3. What happens if passkey registration fails? (Continue with email OTP, allow retry)
