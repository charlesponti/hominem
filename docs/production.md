# V. Production

## Production safety

- The test OTP store is enabled by `NODE_ENV !== 'production'`. A duplicate env-var gate is unnecessary and harmful.
- A successful OTP request does not prove mail delivery. Check deployment, `/api/status`, aggregate HTTP patterns, and the provider path without logging OTPs or tokens.
- Do not casually rotate `BETTER_AUTH_SECRET`; it signs live session cookies.
- Production investigation uses aggregate session counts and expiry through an approved database tunnel. It never retrieves user records, session tokens, cookies, OTPs, or credentials.
- Logs redact secrets and avoid raw third-party URLs when a safer identifier exists.

## Bible law

The root README is the front door. This directory contains the Bible's product, system, voice, and operational parts, plus per-feature specs (Time). The design system lives in `@ponti-studios/ui/docs/`. Durable product, system, experience, voice, and operational laws belong in their part; temporary execution belongs in the work tracker; local implementation detail belongs in code.

When a change alters a durable law, update the relevant part in the same pull request. Delete statements that are no longer true. The Bible explains the system as it exists now.
