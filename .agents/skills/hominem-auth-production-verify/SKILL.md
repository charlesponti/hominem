---
name: hominem-auth-production-verify
description: Verify production web authentication (Career, Finance, Notes) after changing auth config or deployment topology. Use after touching HOMINEM_INTERNAL_API_URL, VITE_PUBLIC_API_URL, PUBLIC_APP_URL, Better Auth cookie settings, or Railway service topology for these apps.
---

# Hominem production auth verification

Ownership, cookie contract, and network-boundary rules live in
[docs/authentication.md](../../../docs/authentication.md) — read it first if
you're unsure which URL a caller should use. This skill is the runbook to run
after a change.

## When to run this

After any change to auth configuration or deployment topology for Career,
Finance, or Notes: env var edits (`HOMINEM_INTERNAL_API_URL`,
`VITE_PUBLIC_API_URL`, `PUBLIC_APP_URL`), Better Auth cookie settings, or
Railway service/network changes affecting these apps.

## Verification steps

1. Visit a protected Career or Finance route in a browser and confirm it
   redirects to the API hosted `/login` page (`https://api.ponti.io/login`).
2. Submit the OTP there and confirm the API response sets Better Auth session
   cookies (`Domain=.ponti.io`, `Secure`, `HttpOnly`, `SameSite=Lax`) accepted
   by the browser.
3. Navigate to the protected route again and confirm it loads rather than
   redirecting back to sign-in.
4. Confirm the app server's session/data requests reach the API service
   directly (private Railway URL) without Cloudflare interception — a
   redirect-loop back to sign-in after a successful OTP is the signature
   symptom of an SSR call accidentally going through the public
   Cloudflare-protected URL instead.

## Diagnosis rules

- Use HTTP status patterns and aggregate session data only. Never log, copy,
  or inspect OTPs, session tokens, or cookie values during production
  diagnosis.
- If step 3 fails right after a successful step 2, suspect the server is
  calling `VITE_PUBLIC_API_URL` (or falling back to it) instead of the
  required `HOMINEM_INTERNAL_API_URL` for its SSR session check — see the
  network boundary table in [docs/authentication.md](../../../docs/authentication.md).
- `HOMINEM_INTERNAL_API_URL` must never fall back to the public URL. A missing
  production value should stop the app, not silently route SSR checks through
  Cloudflare.
